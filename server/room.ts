import { SIM_DT, SLOTS } from '../src/core/config';
import { TRACKS, trackById } from '../src/content/tracks';
import type { UpgradeId } from '../src/content/trucks';
import { Session } from '../src/game/session';
import type { ClientMsg, DriverInfo, Mode, RoomState, ServerMsg } from '../src/net/protocol';
import { aiControls } from '../src/sim/ai';
import { Race } from '../src/sim/race';
import type { Controls, Truck } from '../src/sim/truck';
import { buildTrack, Track } from '../src/track/build';

export interface Conn {
  id: number;
  room: Room | null;
  send(m: ServerMsg): void;
}

const ITEMS = ['tires', 'shocks', 'accel', 'speed', 'nitro'];
const built = new Map<string, Track>();

function trackFor(id: string): Track {
  let t = built.get(id);
  if (!t) {
    t = buildTrack(trackById(id));
    built.set(id, t);
  }
  return t;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** One online game: up to four players, the race itself, and the championship around it. */
export class Room {
  conns = new Map<number, Conn>();
  private host = -1;
  private seats: (number | null)[] = new Array(SLOTS).fill(null);
  private state: RoomState = 'lobby';
  private session = new Session();
  private race: Race | null = null;
  private inputs: Controls[] = [];
  private last: Controls[] = [];
  private ready: boolean[] = new Array(SLOTS).fill(false);
  private acc = 0;
  private tick = 0;

  constructor(public code: string) {
    for (let i = 0; i < SLOTS; i++) {
      this.inputs.push({ steer: 0, gas: 0, brake: 0, nitro: false });
      this.last.push({ steer: 0, gas: 0, brake: 0, nitro: false });
    }
  }

  /** Returns an error message, or null when the player is seated. */
  add(c: Conn): string | null {
    if (this.state !== 'lobby') return 'RACE IN PROGRESS';
    const free = this.seats.indexOf(null);
    if (free < 0) return 'ROOM FULL';
    this.seats[free] = c.id;
    this.conns.set(c.id, c);
    c.room = this;
    if (this.host < 0) this.host = c.id;
    this.sendRoom();
    return null;
  }

  remove(c: Conn): void {
    this.conns.delete(c.id);
    c.room = null;
    const slot = this.seats.indexOf(c.id);
    if (slot >= 0) {
      this.seats[slot] = null;
      // Mid-game, the computer takes over the truck.
      const d = this.session.drivers[slot];
      if (d && this.state !== 'lobby') d.device = null;
      const t = this.race?.trucks.find((k) => k.slot === slot);
      if (t) t.human = false;
    }
    if (this.host === c.id) this.host = this.conns.keys().next().value ?? -1;
    if (!this.conns.size) return;
    this.sendRoom();
    if (this.state === 'shop') this.checkShop();
  }

  handle(c: Conn, m: ClientMsg): void {
    const slot = this.seats.indexOf(c.id);
    if (slot < 0) return;
    switch (m.t) {
      case 'in': {
        const s = m.s;
        if (!Array.isArray(s) || s.length < 4) return;
        const inp = this.inputs[slot];
        inp.steer = Math.max(-1, Math.min(1, Number(s[0]) || 0));
        inp.gas = s[1] ? 1 : 0;
        inp.brake = s[2] ? 1 : 0;
        inp.nitro = !!s[3];
        return;
      }
      case 'start': {
        if (c.id !== this.host || this.state !== 'lobby') return;
        const mode: Mode = m.mode === 'champ' ? 'champ' : 'quick';
        this.session.setup(this.seats.map((s) => (s === null ? null : 0)), mode);
        if (mode === 'quick') this.session.round = Math.max(0, Math.min(TRACKS.length - 1, Math.floor(Number(m.track) || 0)));
        this.beginRace();
        return;
      }
      case 'next': {
        if (c.id !== this.host) return;
        if (this.state === 'results') {
          if (this.session.mode === 'quick') this.toLobby();
          else if (this.session.lastRound) {
            this.state = 'champion';
            this.sendRoom();
            this.all({ t: 'champion', drivers: this.drivers() });
          } else {
            this.state = 'shop';
            this.ready.fill(false);
            this.sendRoom();
            this.all({ t: 'shop', drivers: this.drivers() });
          }
        } else if (this.state === 'champion') {
          this.toLobby();
        }
        return;
      }
      case 'buy': {
        if (this.state !== 'shop' || this.ready[slot] || !ITEMS.includes(m.item)) return;
        this.session.buy(this.session.drivers[slot], m.item as UpgradeId | 'nitro');
        this.all({ t: 'shop', drivers: this.drivers() });
        return;
      }
      case 'ready': {
        if (this.state !== 'shop') return;
        this.ready[slot] = !!m.v;
        this.all({ t: 'shop', drivers: this.drivers() });
        this.checkShop();
        return;
      }
    }
  }

  update(dt: number): void {
    const race = this.race;
    if (this.state !== 'race' || !race) return;
    this.acc = Math.min(this.acc + dt, 0.1);
    while (this.acc >= SIM_DT) {
      race.step(SIM_DT, this.control);
      this.acc -= SIM_DT;
    }
    race.events.length = 0;
    if (++this.tick % 2 === 0) this.snapshot(race);
    if (race.phase === 'done') {
      this.snapshot(race);
      this.session.apply(race);
      this.race = null;
      this.state = 'results';
      this.sendRoom();
      this.all({ t: 'results', rows: this.session.results, drivers: this.drivers() });
    }
  }

  private control = (t: Truck): Controls => {
    const race = this.race!;
    const c = this.seats[t.slot] !== null && !t.finished ? this.inputs[t.slot] : aiControls(t, race, SIM_DT, t.finished ? 0.5 : 1);
    const l = this.last[t.slot];
    l.steer = c.steer;
    l.gas = c.gas;
    l.brake = c.brake;
    l.nitro = c.nitro;
    return c;
  };

  private beginRace(): void {
    const def = trackById(this.session.trackId);
    for (const i of this.inputs) Object.assign(i, { steer: 0, gas: 0, brake: 0, nitro: false });
    const seed = (Math.random() * 0xffff) | 0;
    this.race = new Race(trackFor(def.id), this.session.entries(), def.laps, seed);
    this.acc = 0;
    this.state = 'race';
    this.sendRoom();
    this.all({ t: 'race', mode: this.session.mode, round: this.session.round, trackId: def.id, laps: def.laps, seed, drivers: this.drivers() });
  }

  private checkShop(): void {
    const seated = this.seats.map((s, i) => (s === null ? -1 : i)).filter((i) => i >= 0);
    if (!seated.length || !seated.every((i) => this.ready[i])) return;
    this.session.aiShop(Math.random);
    this.session.round++;
    this.beginRace();
  }

  private toLobby(): void {
    this.state = 'lobby';
    this.race = null;
    this.sendRoom();
  }

  private drivers(): DriverInfo[] {
    return this.session.drivers.map((d) => ({
      slot: d.slot, client: this.seats[d.slot], name: d.name, money: d.money, points: d.points,
      up: d.up, nitro: d.nitro, ready: this.ready[d.slot],
    }));
  }

  private snapshot(race: Race): void {
    const k = race.trucks.map((t) => {
      const c = this.last[t.slot];
      return [
        t.slot, r2(t.x), r2(t.y), r2(t.z), r2(t.vz), r2(t.vx), r2(t.vy), Math.round(t.h * 1000) / 1000,
        t.lap, t.pos, t.nitro, r2(Math.max(0, t.nitroT)), t.cash, t.finished ? 1 : 0, t.place,
        r2(c.steer), c.gas, c.brake, c.nitro ? 1 : 0, t.idx, t.cp, t.passed, r2(t.finishTime),
      ];
    });
    const pk = race.pickups.map((p) => [r2(p.x), r2(p.y), p.type === 'cash' ? 1 : 0, r2(p.t)]);
    this.all({ t: 'snap', p: race.phase, c: r2(race.count), tm: r2(race.time), k, pk });
  }

  private sendRoom(): void {
    for (const c of this.conns.values()) {
      c.send({ t: 'room', code: this.code, you: c.id, host: this.host, state: this.state, seats: this.seats });
    }
  }

  private all(m: ServerMsg): void {
    for (const c of this.conns.values()) c.send(m);
  }
}
