import { CPU_NAMES, MAX_NITRO, PAINTS, POINTS } from '../content/drivers';
import { calendar, catalogById, classesOf, freshUpgrades, hasSeries, modeById, seriesById, statsFor, vehicleById, vehiclesIn } from '../content/registry';
import type { Catalog, Rivals, SeriesDef, Upgrades } from '../content/types';
import type { Entry, Race } from '../sim/race';

/** Device value for a human who is playing from another machine. */
export const REMOTE = 99;
const SAVE_KEY = 'mudline.season';

export interface Driver {
  slot: number;
  /** Input device for a human, null for a computer driver. */
  device: number | null;
  name: string;
  vehicle: string;
  /** Index into the paint list. */
  color: number;
  money: number;
  points: number;
  up: Upgrades;
  nitro: number;
}

export interface ResultRow { slot: number; name: string; place: number; prize: number; cash: number; time: number }
export interface SetupOpts { vehicles?: (string | undefined)[]; paints?: (number | undefined)[]; klass?: string }

/** One run through a series: who is driving what, their money and parts, and where the series has got to. */
export class Session {
  drivers: Driver[] = [];
  mode: 'champ' | 'quick' = 'quick';
  round = 0;
  series: SeriesDef = seriesById('');
  /** The class everyone is racing in, or '' for a series without classes. */
  klass = '';
  results: ResultRow[] = [];
  /** Finishing place of every slot in each round run so far. */
  history: number[][] = [];

  get order(): string[] {
    return calendar(this.series, this.klass);
  }

  get catalog(): Catalog {
    return catalogById(this.series.catalog);
  }

  /** How this series is drawn, and which upgrade screen it uses; both come from its mode. */
  get style(): 'retro' | 'modern' {
    return modeById(this.series.mode).style;
  }

  get shopScene(): 'shop' | 'garage' {
    return modeById(this.series.mode).shop;
  }

  get rivals(): Rivals {
    return this.series.rivals ?? { skill: 0.9, perRound: 0.008, max: 1, catchUp: 0, nitro: 0.35 };
  }

  /** Sets a race up with this series' rival behaviour. */
  tune(race: Race): Race {
    race.catchUp = this.rivals.catchUp;
    race.aiNitro = this.rivals.nitro;
    return race;
  }

  /** Seats ask for a vehicle and paint; anything missing, not allowed or already taken is replaced. */
  setup(devices: (number | null)[], mode: 'champ' | 'quick', seriesId: string, o: SetupOpts = {}): void {
    this.series = seriesById(seriesId);
    this.mode = mode;
    this.round = 0;
    this.history = [];
    this.results = [];
    const classes = classesOf(this.series);
    this.klass = o.klass && classes.includes(o.klass) ? o.klass : classes[0] ?? '';
    const allowed = vehiclesIn(this.series, this.klass);
    // A single race is run on mid-level parts so it is not a crawl.
    const up = freshUpgrades(this.catalog, mode === 'quick' ? 2 : 0);
    const taken = new Set<number>();
    devices.forEach((dev, slot) => {
      const p = o.paints?.[slot];
      if (dev !== null && p !== undefined && p >= 0 && p < PAINTS.length && !taken.has(p)) taken.add(p);
    });
    const free = (): number => {
      let i = 0;
      while (taken.has(i)) i++;
      taken.add(i);
      return i;
    };
    let human = 0;
    this.drivers = devices.map((device, slot) => {
      const pick = o.vehicles?.[slot];
      const p = o.paints?.[slot];
      const own = device !== null && p !== undefined && p >= 0 && p < PAINTS.length;
      return {
        slot, device,
        name: device === null ? CPU_NAMES[slot] : `P${++human}`,
        vehicle: pick && allowed.includes(pick) ? pick : allowed[slot % allowed.length],
        color: own ? p : -1,
        money: this.series.startMoney, points: 0,
        up: { ...up },
        nitro: mode === 'quick' ? 5 : this.series.startNitro,
      };
    });
    // With no paint asked for, every seat keeps its arcade colour.
    for (const d of this.drivers) if (d.color < 0) d.color = taken.has(d.slot) ? free() : (taken.add(d.slot), d.slot);
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
    return this.drivers.map((d) => {
      const v = vehicleById(d.vehicle);
      // Computer drivers get quicker as a championship goes on; how quick is set by the series.
      const r = this.rivals;
      const skill = d.device !== null ? 1 : Math.min(r.max, r.skill + d.slot * 0.015 + this.round * r.perRound);
      return {
        slot: d.slot, human: d.device !== null, name: d.name, vehicle: v.id, color: d.color, radius: v.radius,
        stats: statsFor(v, this.catalog, d.up, skill), nitro: d.nitro,
      };
    });
  }

  apply(race: Race): void {
    this.results = [];
    const places: number[] = [];
    for (const t of race.trucks) {
      const d = this.drivers[t.slot];
      const prize = this.mode === 'champ' ? this.series.prizes[t.place] ?? 0 : 0;
      d.money += prize + t.cash;
      d.points += POINTS[t.place] ?? 0;
      d.nitro = this.mode === 'quick' ? 5 : t.nitro;
      places[t.slot] = t.place;
      this.results.push({ slot: t.slot, name: d.name, place: t.place, prize, cash: t.cash, time: t.finished ? t.finishTime : -1 });
    }
    this.history[this.round] = places;
    this.results.sort((a, b) => a.place - b.place);
  }

  /** Price of the next tier in a category, or -1 when it is maxed. */
  price(d: Driver, categoryId: string): number {
    const c = this.catalog.categories.find((k) => k.id === categoryId);
    const next = c?.tiers[(d.up[categoryId] ?? 0) + 1];
    return next ? next.price : -1;
  }

  /** Buys the next tier of a part category, or one nitro bottle for the id 'nitro'. */
  buy(d: Driver, id: string): boolean {
    if (id === 'nitro') {
      if (d.money < this.catalog.nitroPrice || d.nitro >= MAX_NITRO) return false;
      d.money -= this.catalog.nitroPrice;
      d.nitro++;
      return true;
    }
    const price = this.price(d, id);
    if (price < 0 || d.money < price) return false;
    d.money -= price;
    d.up[id] = (d.up[id] ?? 0) + 1;
    return true;
  }

  /** Repaints a driver, swapping with whoever already wears that paint so every vehicle stays distinct. */
  paint(d: Driver, color: number): void {
    const other = this.drivers.find((k) => k !== d && k.color === color);
    if (other) other.color = d.color;
    d.color = color;
  }

  /** Computer drivers spend their winnings the same way players do. */
  aiShop(rand: () => number): void {
    const cats = this.catalog.categories;
    for (const d of this.drivers) {
      if (d.device !== null) continue;
      for (let tries = 0; tries < 12; tries++) {
        const pick = cats[(rand() * cats.length) | 0].id;
        if (!this.buy(d, pick) && d.nitro < 3) this.buy(d, 'nitro');
      }
    }
  }

  standings(): Driver[] {
    return [...this.drivers].sort((a, b) => b.points - a.points || b.money - a.money);
  }

  /** Keeps a championship in progress so it can be picked up again later. */
  save(): void {
    try {
      const { drivers, mode, round, klass, history } = this;
      localStorage.setItem(SAVE_KEY, JSON.stringify({ series: this.series.id, drivers, mode, round, klass, history }));
    } catch {
      // Storage unavailable: the season lasts until the page closes.
    }
  }

  /** Restores a saved championship. Returns false when there is none or its content is no longer in the game. */
  load(): boolean {
    try {
      const o = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
      if (!o || !hasSeries(o.series) || !Array.isArray(o.drivers) || o.drivers.length !== 4) return false;
      const series = seriesById(o.series);
      const allowed = vehiclesIn(series, o.klass);
      if (o.drivers.some((d: Driver) => !allowed.includes(d.vehicle)) || o.round >= calendar(series, o.klass).length) return false;
      this.series = series;
      this.drivers = o.drivers;
      this.mode = 'champ';
      this.round = o.round;
      this.klass = o.klass ?? '';
      this.history = o.history ?? [];
      return true;
    } catch {
      return false;
    }
  }

  static clearSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // Nothing stored.
    }
  }
}
