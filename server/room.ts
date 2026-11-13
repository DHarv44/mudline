import { SIM_DT, SLOTS } from '../src/core/config';
import { PAINTS } from '../src/content/drivers';
import { ALL_SERIES, buildFor, calendar, classesOf, hasSeries, seriesById, trackById, vehiclesIn } from '../src/content/registry';
import { Session } from '../src/game/session';
import type { ClientMsg, DriverInfo, Mode, RaceMsg, RoomState, ServerMsg } from '../src/net/protocol';
import { aiControls } from '../src/sim/ai';
import { Race } from '../src/sim/race';
import type { Controls, Truck } from '../src/sim/truck';
import { buildTrack, Track } from '../src/track/build';

export interface Conn {
  id: number;
  /** Identifies the player's browser across reconnects. */
  pid: string;
  room: Room | null;
  send(m: ServerMsg): void;
}

const built = new Map<string, Track>();

/** A track as one class races it; built once and kept. */
function trackFor(id: string, klass: string): Track {
  const key = `${id}/${klass}`;
  let t = built.get(key);
  if (!t) {
    t = buildTrack(trackById(id), buildFor(klass));
    built.set(key, t);
  }
  return t;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * One online game: up to four players, the race itself, and the championship around it.
 * A player who drops out mid-game keeps their truck (the computer drives it) and takes it back on return.
 * Anyone else who arrives mid-game watches, and is given a free truck at the next race.
 */
export class Room {
  conns = new Map<number, Conn>();
  /** When the last player left, or 0 while anyone is connected. */
  emptySince = 0;
  private host = -1;
  private seats: (number | null)[] = new Array(SLOTS).fill(null);
  /** The player each truck belongs to, kept while they are away. */
  private owners: (string | null)[] = new Array(SLOTS).fill(null);
  private state: RoomState = 'lobby';
  private session = new Session();
  private race: Race | null = null;
  private raceMsg: Omit<RaceMsg, 'drivers'> | null = null;
  private inputs: Controls[] = [];
  private last: Controls[] = [];
  private ready: boolean[] = new Array(SLOTS).fill(false);
  private acc = 0;
  private tick = 0;
  /** What the host has set the room to play next. */
  private cfgSeries = ALL_SERIES[0].id;
  private cfgMode: Mode = 'champ';
  private cfgTrack = 0;
  /** Each seat's chosen vehicle. */
  private vehicles: string[] = [];
  private cfgClass = '';
  /** Each seat's paint; every seat wears a different one. */
  private paints: number[] = [0, 1, 2, 3];

  /** Any seat whose vehicle the chosen series and class do not allow gets one that they do. */
  private fixVehicles(): void {
    const series = seriesById(this.cfgSeries);
    const classes = classesOf(series);
    if (!classes.includes(this.cfgClass)) this.cfgClass = classes[0] ?? '';
    const allowed = vehiclesIn(series, this.cfgClass);
    for (let i = 0; i < SLOTS; i++) if (!allowed.includes(this.vehicles[i])) this.vehicles[i] = allowed[i % allowed.length];
  }

  constructor(public code: string) {
    this.fixVehicles();
    for (let i = 0; i < SLOTS; i++) {
      this.inputs.push({ steer: 0, gas: 0, brake: 0, nitro: false });
      this.last.push({ steer: 0, gas: 0, brake: 0, nitro: false });
    }
  }

  add(c: Conn): void {
    this.conns.set(c.id, c);
    c.room = this;
    this.emptySince = 0;
    if (!this.conns.has(this.host)) this.host = c.id;
    if (this.state === 'lobby') {
      this.seatWatchers();
    } else {
      // Back after a drop: the truck that was theirs is theirs again.
      const slot = this.owners.findIndex((o, i) => o === c.pid && this.seats[i] === null);
      if (slot >= 0) {
        this.seats[slot] = c.id;
        this.session.drivers[slot].device = 0;
        const t = this.race?.trucks.find((k) => k.slot === slot);
        if (t) t.human = true;
      }
    }
    this.sendRoom();
    this.catchUp(c);
  }

  remove(c: Conn): void {
    this.conns.delete(c.id);
    c.room = null;
    const slot = this.seats.indexOf(c.id);
    if (slot >= 0) {
      this.seats[slot] = null;
      Object.assign(this.inputs[slot], { steer: 0, gas: 0, brake: 0, nitro: false });
      if (this.state === 'lobby') {
        this.owners[slot] = null;
      } else {
        // Mid-game the computer drives until they come back.
        this.session.drivers[slot].device = null;
        const t = this.race?.trucks.find((k) => k.slot === slot);
        if (t) t.human = false;
      }
    }
    if (!this.conns.size) {
      this.emptySince = Date.now();
      return;
    }
    if (this.host === c.id) this.host = this.conns.keys().next().value ?? -1;
    if (this.state === 'lobby') this.seatWatchers();
    this.sendRoom();
    if (this.state === 'shop') this.checkShop();
  }

  handle(c: Conn, m: ClientMsg): void {
    if (m.t === 'next') {
      this.next(c);
      return;
    }
    if (m.t === 'config') {
      // The host chooses what the room plays.
      if (c.id !== this.host || this.state !== 'lobby' || !hasSeries(String(m.series))) return;
      this.cfgSeries = String(m.series);
      this.cfgClass = String(m.klass ?? '');
      this.cfgMode = m.mode === 'champ' ? 'champ' : 'quick';
      const n = calendar(seriesById(this.cfgSeries), this.cfgClass).length;
      this.cfgTrack = Math.max(0, Math.min(n - 1, Math.floor(Number(m.track) || 0)));
      this.fixVehicles();
      this.sendRoom();
      return;
    }
    if (m.t === 'start') {
      if (c.id !== this.host || this.state !== 'lobby' || this.seats.every((s) => s === null)) return;
      this.session.setup(this.seats.map((s) => (s === null ? null : 0)), this.cfgMode, this.cfgSeries, {
        vehicles: this.vehicles, paints: this.paints, klass: this.cfgClass,
      });
      if (this.cfgMode === 'quick') this.session.round = this.cfgTrack;
      this.beginRace();
      return;
    }
    const slot = this.seats.indexOf(c.id);
    if (slot < 0) return;
    if (m.t === 'vehicle') {
      if (this.state !== 'lobby') return;
      if (vehiclesIn(seriesById(this.cfgSeries), this.cfgClass).includes(String(m.id))) this.vehicles[slot] = String(m.id);
      const paint = Math.floor(Number(m.paint));
      if (paint >= 0 && paint < PAINTS.length && paint !== this.paints[slot]) {
        // Whoever already wears that paint swaps, so every vehicle stays distinct.
        const other = this.paints.indexOf(paint);
        if (other >= 0) this.paints[other] = this.paints[slot];
        this.paints[slot] = paint;
      }
      this.sendRoom();
    } else if (m.t === 'in') {
      const s = m.s;
      if (!Array.isArray(s) || s.length < 4) return;
      const inp = this.inputs[slot];
      inp.steer = Math.max(-1, Math.min(1, Number(s[0]) || 0));
      inp.gas = s[1] ? 1 : 0;
      inp.brake = s[2] ? 1 : 0;
      inp.nitro = !!s[3];
    } else if (m.t === 'buy') {
      if (this.state !== 'shop' || this.ready[slot]) return;
      this.session.buy(this.session.drivers[slot], String(m.item));
      this.all({ t: 'shop', drivers: this.drivers() });
    } else if (m.t === 'ready') {
      if (this.state !== 'shop') return;
      this.ready[slot] = !!m.v;
      this.all({ t: 'shop', drivers: this.drivers() });
      this.checkShop();
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

  private next(c: Conn): void {
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
        this.checkShop();
      }
    } else if (this.state === 'champion') {
      this.toLobby();
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

  /** Gives each watching player a truck nobody owns. Returns true if anyone was seated. */
  private seatWatchers(): boolean {
    let changed = false;
    for (const c of this.conns.values()) {
      if (this.seats.includes(c.id)) continue;
      const slot = this.seats.findIndex((s, i) => s === null && this.owners[i] === null);
      if (slot < 0) break;
      this.seats[slot] = c.id;
      this.owners[slot] = c.pid;
      const d = this.session.drivers[slot];
      if (d && this.state !== 'lobby') {
        // Joining a championship under way: they take over that computer driver's standing.
        d.device = 0;
        const used = new Set(this.session.drivers.map((k) => k.name));
        let n = 1;
        while (used.has(`P${n}`)) n++;
        d.name = `P${n}`;
      }
      changed = true;
    }
    return changed;
  }

  private beginRace(): void {
    this.seatWatchers();
    const def = trackById(this.session.trackId);
    for (const i of this.inputs) Object.assign(i, { steer: 0, gas: 0, brake: 0, nitro: false });
    const seed = (Math.random() * 0xffff) | 0;
    const entries = this.session.entries();
    this.race = new Race(trackFor(def.id, this.session.klass), entries, def.laps, seed);
    this.raceMsg = { t: 'race', mode: this.session.mode, round: this.session.round, trackId: def.id, laps: def.laps, seed, entries };
    this.acc = 0;
    this.state = 'race';
    this.sendRoom();
    this.all({ ...this.raceMsg, drivers: this.drivers() });
  }

  /** Brings a player who has just connected up to where the room is. */
  private catchUp(c: Conn): void {
    const drivers = this.drivers();
    if (this.state === 'race' && this.raceMsg) c.send({ ...this.raceMsg, drivers });
    else if (this.state === 'results') c.send({ t: 'results', rows: this.session.results, drivers });
    else if (this.state === 'shop') c.send({ t: 'shop', drivers });
    else if (this.state === 'champion') c.send({ t: 'champion', drivers });
  }

  private checkShop(): void {
    const seated = this.seats.map((s, i) => (s === null ? -1 : i)).filter((i) => i >= 0);
    // With only watchers present there is nobody to wait for; they get trucks in the next race.
    if (!this.conns.size || !seated.every((i) => this.ready[i])) return;
    this.session.aiShop(Math.random);
    this.session.round++;
    this.beginRace();
  }

  private toLobby(): void {
    this.state = 'lobby';
    this.race = null;
    // Trucks held for players who never came back are free again.
    for (let i = 0; i < SLOTS; i++) if (this.seats[i] === null) this.owners[i] = null;
    this.seatWatchers();
    this.sendRoom();
  }

  private drivers(): DriverInfo[] {
    return this.session.drivers.map((d) => ({
      slot: d.slot, client: this.seats[d.slot], name: d.name, vehicle: d.vehicle, color: d.color, money: d.money, points: d.points,
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
      c.send({
        t: 'room', code: this.code, you: c.id, host: this.host, state: this.state, seats: this.seats,
        series: this.state === 'lobby' ? this.cfgSeries : this.session.series.id,
        mode: this.cfgMode, track: this.cfgTrack, vehicles: this.vehicles, paints: this.paints,
        klass: this.state === 'lobby' ? this.cfgClass : this.session.klass,
        round: this.session.round, history: this.session.history,
      });
    }
  }

  private all(m: ServerMsg): void {
    for (const c of this.conns.values()) c.send(m);
  }
}
