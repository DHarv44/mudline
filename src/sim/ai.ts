import { clamp, wrapAngle } from '../core/config';
import type { Race } from './race';
import { Controls, speedOf, Truck } from './truck';

/** Drives a truck along the racing line; also used to coast human trucks after they finish. */
export function aiControls(t: Truck, race: Race, dt: number, throttle = 1): Controls {
  const tr = race.track;
  const n = tr.n;
  const sp = speedOf(t);
  const ai = t.ai;

  ai.laneT -= dt;
  if (ai.laneT <= 0) {
    ai.laneT = 2 + race.rand() * 3;
    ai.lane = (race.rand() - 0.5) * tr.half * 0.9;
  }

  const base = Math.round(t.idx);
  const i = (base + Math.round(8 + sp * 0.1)) % n;
  const gx = tr.sx[i] - tr.ty[i] * ai.lane;
  const gy = tr.sy[i] + tr.tx[i] * ai.lane;
  const diff = wrapAngle(Math.atan2(gy - t.y, gx - t.x) - t.h);

  if (ai.rev > 0) {
    ai.rev -= dt;
    return { steer: -clamp(diff * 2, -1, 1), gas: 0, brake: 1, nitro: false };
  }
  if (race.phase === 'racing' && sp < 8) {
    ai.stuck += dt;
    if (ai.stuck > 1.1) {
      ai.stuck = 0;
      ai.rev = 0.7;
    }
  } else {
    ai.stuck = 0;
  }

  let gas = throttle;
  let brake = 0;
  const off = Math.abs(diff);
  if (off > 0.75 && sp > 55) {
    gas = 0;
    if (off > 1.2) brake = 1;
  }

  let nitro = false;
  if (t.nitro > 0 && throttle >= 1 && off < 0.12 && sp > 50 && t.z <= 0) {
    const j = (base + 45) % n;
    const straight = tr.tx[base % n] * tr.tx[j] + tr.ty[base % n] * tr.ty[j];
    if (straight > 0.92 && race.rand() < dt * race.aiNitro) nitro = true;
  }
  return { steer: clamp(diff * 2.6, -1, 1), gas, brake, nitro };
}
