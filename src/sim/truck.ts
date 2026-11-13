import { DIRT, JUMP, MUD, SAND, Stats, WATER, WHOOPS } from '../content/types';
import { nearAt, sdAt, surfAt } from '../track/build';
import type { Race } from './race';

export interface Controls { steer: number; gas: number; brake: number; nitro: boolean }

export const NO_INPUT: Controls = { steer: 0, gas: 0, brake: 0, nitro: false };

export interface Truck {
  slot: number;
  human: boolean;
  name: string;
  /** Vehicle id, for drawing. */
  vehicle: string;
  radius: number;
  stats: Stats;
  x: number; y: number; z: number; vz: number;
  vx: number; vy: number; h: number;
  /** Nearest centreline sample. */
  idx: number;
  lap: number;
  /** Next checkpoint to cross. */
  cp: number;
  passed: number;
  score: number;
  pos: number;
  finished: boolean;
  finishTime: number;
  place: number;
  nitro: number;
  nitroT: number;
  nitroHeld: boolean;
  cash: number;
  lastSurf: number;
  /** Strength of the ramp last driven over. */
  lastPow: number;
  whoop: number;
  bigAir: boolean;
  slip: number;
  ai: { lane: number; laneT: number; stuck: number; rev: number };
}

const GRAVITY = 200;

export function speedOf(t: Truck): number {
  return Math.hypot(t.vx, t.vy);
}

export function stepTruck(t: Truck, c: Controls, race: Race, dt: number): void {
  const tr = race.track;
  const st = t.stats;
  const grounded = t.z <= 0;
  const surf = grounded ? surfAt(tr, t.x, t.y) : DIRT;
  let maxV = st.top;
  let acc = st.accel;
  let grip = st.grip;
  if (surf === MUD) {
    maxV *= st.mud;
    grip *= 0.45;
  } else if (surf === WATER) {
    maxV *= 0.72;
    grip *= 0.7;
  } else if (surf === SAND) {
    maxV *= 0.55 + 0.45 * st.mud;
    grip *= 0.75;
  } else if (surf === JUMP) {
    t.lastPow = tr.samplePow[nearAt(tr, t.x, t.y)];
  }
  if (c.nitro && !t.nitroHeld && t.nitro > 0 && t.nitroT <= 0 && grounded) {
    t.nitro--;
    t.nitroT = st.boostTime;
    race.events.push({ type: 'nitro', slot: t.slot });
  }
  t.nitroHeld = c.nitro;
  if (t.nitroT > 0) {
    t.nitroT -= dt;
    maxV *= st.boost;
    acc *= 2.8;
  }

  if (grounded) {
    let fx = Math.cos(t.h);
    let fy = Math.sin(t.h);
    let vf = t.vx * fx + t.vy * fy;
    const k = Math.min(1, Math.abs(vf) / 30) * (vf < 0 ? -1 : 1);
    t.h += c.steer * st.turn * k * dt;
    fx = Math.cos(t.h);
    fy = Math.sin(t.h);
    vf = t.vx * fx + t.vy * fy;
    let vl = -t.vx * fy + t.vy * fx;
    if (c.gas > 0 && vf < maxV) vf += acc * c.gas * (1.15 - Math.max(0, vf) / maxV) * dt;
    if (vf > maxV) vf -= (vf - maxV) * 2.5 * dt;
    if (c.brake > 0) {
      vf -= (vf > 4 ? 170 : 70) * dt;
      if (vf < -42) vf = -42;
    }
    if (c.gas <= 0 && c.brake <= 0) vf *= Math.exp(-0.8 * dt);
    t.slip = Math.abs(vl);
    vl *= Math.exp(-grip * dt);
    t.vx = fx * vf - fy * vl;
    t.vy = fy * vf + fx * vl;
  } else {
    t.h += c.steer * st.air * dt;
  }

  t.x += t.vx * dt;
  t.y += t.vy * dt;
  const sp = speedOf(t);

  if (grounded) {
    if (t.lastSurf === JUMP && surf !== JUMP && sp > 45) {
      t.vz = Math.min(110, sp * 0.5 * st.jump * t.lastPow);
      t.z = 0.01;
      t.bigAir = true;
    } else if (surf === WHOOPS && sp > 40) {
      t.whoop -= sp * dt;
      if (t.whoop <= 0) {
        t.whoop = 10;
        t.vz = 15;
        t.z = 0.01;
        t.bigAir = false;
        t.vx *= st.whoop;
        t.vy *= st.whoop;
      }
    }
    t.lastSurf = surf;
  } else {
    t.vz -= GRAVITY * dt;
    t.z += t.vz * dt;
    if (t.z <= 0) {
      t.z = 0;
      t.vz = 0;
      if (t.bigAir) {
        t.vx *= st.land;
        t.vy *= st.land;
        race.events.push({ type: 'land', slot: t.slot });
        for (let i = 0; i < 8; i++) {
          const a = race.rand() * Math.PI * 2;
          race.parts.emit(t.x, t.y, Math.cos(a) * 30, Math.sin(a) * 30, 0.4, '#e8c898', 1.5);
        }
      }
      t.lastSurf = surfAt(tr, t.x, t.y);
    }
  }

  collideWall(t, race, dt);
  effects(t, race, surf, sp, dt, grounded);
}

function collideWall(t: Truck, race: Race, dt: number): void {
  const tr = race.track;
  const d = sdAt(tr, t.x, t.y) + t.radius;
  if (d <= 0) return;
  const gx = sdAt(tr, t.x + 1, t.y) - sdAt(tr, t.x - 1, t.y);
  const gy = sdAt(tr, t.x, t.y + 1) - sdAt(tr, t.x, t.y - 1);
  const len = Math.hypot(gx, gy);
  if (len < 1e-4) {
    // Somehow beyond the barrier: put the truck back on the racing line.
    const i = Math.round(t.idx) % tr.n;
    t.x = tr.sx[i];
    t.y = tr.sy[i];
    t.vx = t.vy = 0;
    return;
  }
  const nx = gx / len;
  const ny = gy / len;
  t.x -= nx * d;
  t.y -= ny * d;
  const vn = t.vx * nx + t.vy * ny;
  if (vn > 0) {
    t.vx -= nx * vn * 1.25;
    t.vy -= ny * vn * 1.25;
    const fr = Math.exp(-1.2 * dt);
    t.vx *= fr;
    t.vy *= fr;
    if (vn > 35) race.events.push({ type: 'bump', slot: t.slot });
  }
}

function effects(t: Truck, race: Race, surf: number, sp: number, dt: number, grounded: boolean): void {
  const r = race.rand;
  const bx = t.x - Math.cos(t.h) * 6;
  const by = t.y - Math.sin(t.h) * 6;
  if (t.nitroT > 0) {
    race.parts.emit(bx, by - t.z, -t.vx * 0.2 + (r() - 0.5) * 20, -t.vy * 0.2 + (r() - 0.5) * 20, 0.25, r() < 0.5 ? '#ffd040' : '#ff7020', 2);
  }
  if (!grounded || sp < 30) return;
  if (surf === WATER) {
    if (r() < dt * 40) race.parts.emit(bx, by, (r() - 0.5) * 50, (r() - 0.5) * 50 - 10, 0.35, r() < 0.5 ? '#bfe4ff' : '#6ab0f0', 1.5);
  } else if (surf === SAND) {
    if (r() < dt * 30) race.parts.emit(bx, by, (r() - 0.5) * 30, (r() - 0.5) * 30 - 6, 0.5, '#f0dca8', 1.5);
  } else if (surf === MUD) {
    if (r() < dt * 30) race.parts.emit(bx, by, (r() - 0.5) * 40, (r() - 0.5) * 40, 0.4, '#4a2c18', 1.5);
  } else if (r() < dt * (8 + t.slip * 0.6)) {
    race.parts.emit(bx, by, (r() - 0.5) * 14, (r() - 0.5) * 14 - 4, 0.45, '#e6cda4', 1);
  }
  if (t.slip > 22 || surf === MUD) {
    const lx = -Math.sin(t.h) * 4;
    const ly = Math.cos(t.h) * 4;
    race.marks.push(bx + lx, by + ly, bx - lx, by - ly);
  }
}
