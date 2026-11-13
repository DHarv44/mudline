import { TRACKS } from '../content/tracks';
import {
  CPU_NAMES, MAX_LEVEL, NITRO_PRICE, POINTS, PRIZES, START_MONEY, START_NITRO, statsFor, UpgradeId, Upgrades, upgradePrice, UPGRADES,
} from '../content/trucks';
import type { Entry, Race } from '../sim/race';

/** Device value for a human who is playing from another machine. */
export const REMOTE = 99;

export interface Driver {
  slot: number;
  /** Input device for a human, null for a computer driver. */
  device: number | null;
  name: string;
  money: number;
  points: number;
  up: Upgrades;
  nitro: number;
}

export interface ResultRow { slot: number; name: string; place: number; prize: number; cash: number; time: number }

export class Session {
  drivers: Driver[] = [];
  mode: 'champ' | 'quick' = 'quick';
  round = 0;
  order: string[] = TRACKS.map((t) => t.id);
  results: ResultRow[] = [];

  setup(devices: (number | null)[], mode: 'champ' | 'quick'): void {
    this.mode = mode;
    this.round = 0;
    let human = 0;
    const lvl = mode === 'quick' ? 2 : 0;
    this.drivers = devices.map((device, slot) => ({
      slot, device,
      name: device === null ? CPU_NAMES[slot] : `P${++human}`,
      money: START_MONEY, points: 0,
      up: { tires: lvl, shocks: lvl, accel: lvl, speed: lvl },
      nitro: mode === 'quick' ? 5 : START_NITRO,
    }));
  }

  get humans(): Driver[] {
    return this.drivers.filter((d) => d.device !== null);
  }

  /** Humans playing on this machine (online, other players are remote). */
  get locals(): Driver[] {
    return this.drivers.filter((d) => d.device !== null && d.device !== REMOTE);
  }

  get trackId(): string {
    return this.order[this.round % this.order.length];
  }

  get lastRound(): boolean {
    return this.round >= this.order.length - 1;
  }

  entries(): Entry[] {
    return this.drivers.map((d) => ({
      slot: d.slot,
      human: d.device !== null,
      name: d.name,
      // Computer drivers hold a little back early in a championship.
      stats: statsFor(d.up, d.device !== null ? 1 : Math.min(1, 0.9 + d.slot * 0.015 + this.round * 0.008)),
      nitro: d.nitro,
    }));
  }

  apply(race: Race): void {
    this.results = [];
    for (const t of race.trucks) {
      const d = this.drivers[t.slot];
      const prize = this.mode === 'champ' ? PRIZES[t.place] ?? 0 : 0;
      d.money += prize + t.cash;
      d.points += POINTS[t.place] ?? 0;
      d.nitro = this.mode === 'quick' ? 5 : t.nitro;
      this.results.push({ slot: t.slot, name: d.name, place: t.place, prize, cash: t.cash, time: t.finished ? t.finishTime : -1 });
    }
    this.results.sort((a, b) => a.place - b.place);
  }

  buy(d: Driver, id: UpgradeId | 'nitro'): boolean {
    if (id === 'nitro') {
      if (d.money < NITRO_PRICE || d.nitro >= 9) return false;
      d.money -= NITRO_PRICE;
      d.nitro++;
      return true;
    }
    const price = upgradePrice(d.up[id]);
    if (d.up[id] >= MAX_LEVEL || d.money < price) return false;
    d.money -= price;
    d.up[id]++;
    return true;
  }

  /** Computer drivers spend their winnings the same way players do. */
  aiShop(rand: () => number): void {
    for (const d of this.drivers) {
      if (d.device !== null) continue;
      for (let tries = 0; tries < 12; tries++) {
        const pick = UPGRADES[(rand() * UPGRADES.length) | 0].id;
        if (!this.buy(d, pick) && d.nitro < 3) this.buy(d, 'nitro');
      }
    }
  }

  standings(): Driver[] {
    return [...this.drivers].sort((a, b) => b.points - a.points || b.money - a.money);
  }
}
