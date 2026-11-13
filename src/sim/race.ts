import { GATES, VIEW_W } from '../core/config';
import { mulberry32, Rand } from '../core/rng';
import { CASH_PICKUP } from '../content/drivers';
import { JUMP, Stats } from '../content/types';
import { Track, wrapIdx } from '../track/build';
import { Particles } from './particles';
import { Controls, NO_INPUT, stepTruck, Truck } from './truck';

export interface Entry { slot: number; human: boolean; name: string; vehicle: string; color: number; radius: number; stats: Stats; nitro: number }
export interface Pickup { x: number; y: number; type: 'nitro' | 'cash'; t: number }
export interface RaceEvent { type: 'count' | 'go' | 'nitro' | 'land' | 'bump' | 'pickup' | 'lap' | 'finish'; slot: number }

export class Race {
  trucks: Truck[] = [];
  phase: 'countdown' | 'racing' | 'done' = 'countdown';
  count = 3.7;
  time = 0;
  pickups: Pickup[] = [];
  parts = new Particles();
  /** Pairs of wheel positions to stamp onto the track as tyre marks. */
  marks: number[] = [];
  events: RaceEvent[] = [];
  rand: Rand;
  /** True on an online client: laps, pickups, ranking and the finish come from the server instead. */
  mirror = false;
  private finishedCount = 0;
  private endT = 0;
  private spawnT = 4;

  constructor(public track: Track, entries: Entry[], public laps: number, seed = 1) {
    this.rand = mulberry32(seed);
    const grid = entries.map((_, i) => i);
    for (let i = grid.length - 1; i > 0; i--) {
      const j = (this.rand() * (i + 1)) | 0;
      [grid[i], grid[j]] = [grid[j], grid[i]];
    }
    const n = track.n;
    entries.forEach((e, k) => {
      const g = grid[k];
      const i = n - 5 - 7 * (g >> 1);
      const lat = (g % 2 ? 1 : -1) * 7;
      this.trucks.push({
        slot: e.slot, human: e.human, name: e.name, vehicle: e.vehicle, color: e.color, radius: e.radius, stats: e.stats,
        x: track.sx[i] - track.ty[i] * lat, y: track.sy[i] + track.tx[i] * lat, z: 0, vz: 0,
        vx: 0, vy: 0, h: Math.atan2(track.ty[i], track.tx[i]),
        idx: i, lap: 0, cp: 0, passed: 0, score: 0, pos: g,
        finished: false, finishTime: 0, place: -1,
        nitro: e.nitro, nitroT: 0, nitroHeld: false, cash: 0,
        lastSurf: 0, lastPow: 1, level: 0, steer: 0, whoop: 0, bigAir: false, slip: 0,
        ai: { lane: lat, laneT: 1 + this.rand() * 2, stuck: 0, rev: 0 },
      });
    });
  }

  get lightsLit(): number {
    return this.count > 3 ? 0 : this.count > 2 ? 1 : this.count > 1 ? 2 : 3;
  }

  step(dt: number, control: (t: Truck) => Controls): void {
    if (this.marks.length > 4000) this.marks.length = 0;
    if (this.phase === 'countdown') {
      const before = Math.ceil(this.count);
      this.count -= dt;
      const after = Math.ceil(this.count);
      if (after < before) this.events.push({ type: after <= 0 ? 'go' : 'count', slot: -1 });
      if (this.count <= 0) this.phase = 'racing';
    }
    const live = this.phase !== 'countdown';
    if (this.phase === 'racing') this.time += dt;

    for (const t of this.trucks) {
      stepTruck(t, live ? control(t) : NO_INPUT, this, dt);
      if (!this.mirror) this.progress(t);
    }
    this.collide();
    this.parts.update(dt);
    if (this.mirror) return;
    if (live) this.updatePickups(dt);
    this.rank();

    if (this.phase === 'racing') {
      const humans = this.trucks.filter((t) => t.human);
      const waitFor = humans.length ? humans : this.trucks;
      // Stragglers get 30 seconds after the winner, so one idle player cannot hold a race open.
      const first = Math.min(...this.trucks.map((t) => (t.finished ? t.finishTime : Infinity)));
      if (waitFor.every((t) => t.finished) || this.time - first > 30) {
        this.endT += dt;
        if (this.endT > 2.5) {
          for (const t of [...this.trucks].sort((a, b) => b.score - a.score)) {
            if (!t.finished) t.place = this.finishedCount++;
          }
          this.phase = 'done';
        }
      }
    }
  }

  private progress(t: Truck): void {
    const tr = this.track;
    const n = tr.n;
    const base = Math.round(t.idx);
    let best = base % n;
    let bd = Infinity;
    for (let k = -10; k <= 30; k++) {
      const i = (base + k + n) % n;
      const d = (tr.sx[i] - t.x) ** 2 + (tr.sy[i] - t.y) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    if (bd > (tr.half * 1.7) ** 2) {
      for (let i = 0; i < n; i += 2) {
        const d = (tr.sx[i] - t.x) ** 2 + (tr.sy[i] - t.y) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
    }
    const prev = t.idx;
    t.idx = best;
    const sector = n / GATES;
    const gate = Math.round(t.cp * sector) % n;
    const dPrev = wrapIdx(tr, prev - gate);
    const dNow = wrapIdx(tr, best - gate);
    if (dPrev < 0 && dNow >= 0 && dNow - dPrev < sector) {
      t.passed++;
      if (t.cp === 0 && !t.finished) {
        t.lap++;
        if (t.lap > this.laps) {
          t.finished = true;
          t.finishTime = this.time;
          t.place = this.finishedCount++;
          this.events.push({ type: 'finish', slot: t.slot });
        } else if (t.lap > 1) {
          this.events.push({ type: 'lap', slot: t.slot });
        }
      }
      t.cp = (t.cp + 1) % GATES;
    }
    const last = Math.round(((t.cp + GATES - 1) % GATES) * sector) % n;
    const frac = Math.min(0.99, Math.max(0, wrapIdx(tr, best - last) / sector));
    t.score = t.passed + (t.passed === 0 ? frac - 1 : frac);
  }

  private rank(): void {
    const order = [...this.trucks].sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.place - b.place;
      return b.score - a.score;
    });
    order.forEach((t, i) => (t.pos = i));
  }

  private collide(): void {
    const ts = this.trucks;
    for (let a = 0; a < ts.length; a++) {
      for (let b = a + 1; b < ts.length; b++) {
        const p = ts[a];
        const q = ts[b];
        if (Math.abs(p.z - q.z) > 4) continue;
        // One on the bridge and one beneath it pass clean.
        if (this.track.local && p.level !== q.level) continue;
        const min = p.radius + q.radius;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d >= min || d < 1e-4) continue;
        const nx = dx / d;
        const ny = dy / d;
        // The heavier vehicle gives way less.
        const total = p.stats.mass + q.stats.mass;
        const wp = q.stats.mass / total;
        const wq = p.stats.mass / total;
        const push = min - d;
        p.x -= nx * push * wp;
        p.y -= ny * push * wp;
        q.x += nx * push * wq;
        q.y += ny * push * wq;
        const rel = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
        if (rel < 0) {
          const j = rel * 1.6;
          p.vx += nx * j * wp;
          p.vy += ny * j * wp;
          q.vx -= nx * j * wq;
          q.vy -= ny * j * wq;
          if (rel < -30) this.events.push({ type: 'bump', slot: p.slot });
        }
      }
    }
  }

  private updatePickups(dt: number): void {
    const tr = this.track;
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.phase === 'racing') {
      this.spawnT = 4 + this.rand() * 3;
      const cap = Math.round(3 * tr.w / VIEW_W);
      if (this.pickups.length < cap) {
        const i = (this.rand() * tr.n) | 0;
        if (tr.sampleSurf[i] !== JUMP && !tr.blocked[i]) {
          const lat = (this.rand() - 0.5) * tr.half * 1.2;
          this.pickups.push({ x: tr.sx[i] - tr.ty[i] * lat, y: tr.sy[i] + tr.tx[i] * lat, type: this.rand() < 0.5 ? 'nitro' : 'cash', t: 14 });
        }
      }
    }
    for (let k = this.pickups.length - 1; k >= 0; k--) {
      const p = this.pickups[k];
      p.t -= dt;
      let taken = p.t <= 0;
      for (const t of this.trucks) {
        if (taken || t.z > 3 || t.finished) continue;
        if ((t.x - p.x) ** 2 + (t.y - p.y) ** 2 < 64) {
          taken = true;
          if (p.type === 'nitro') t.nitro++;
          else t.cash += CASH_PICKUP;
          this.events.push({ type: 'pickup', slot: t.slot });
          for (let i = 0; i < 6; i++) {
            const a = this.rand() * Math.PI * 2;
            this.parts.emit(p.x, p.y, Math.cos(a) * 40, Math.sin(a) * 40, 0.35, p.type === 'nitro' ? '#60d0ff' : '#70e070', 1.5);
          }
        }
      }
      if (taken) this.pickups.splice(k, 1);
    }
  }
}
