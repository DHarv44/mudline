import { wrapAngle } from '../core/config';
import type { Race } from '../sim/race';
import type { Controls } from '../sim/truck';
import type { SnapMsg } from './protocol';

/**
 * Pulls the local copy of a race toward the server's version of it.
 * Other trucks follow the server closely; the player's own truck is corrected gently so steering stays immediate.
 */
export class Mirror {
  /** Latest controls the server reports for each truck, used to keep them moving between updates. */
  controls: Controls[] = [];
  private seenNitro: number[] = [];

  constructor(private race: Race, private mySlot: number) {
    for (let i = 0; i < 4; i++) this.controls.push({ steer: 0, gas: 0, brake: 0, nitro: false });
  }

  apply(s: SnapMsg): void {
    const race = this.race;
    if (s.p === 'countdown') {
      if (race.phase !== 'countdown' || Math.abs(s.c - race.count) > 0.25) {
        race.phase = 'countdown';
        race.count = s.c;
      }
    } else {
      if (race.phase === 'countdown' && race.count > 0.25) race.count = 0.01;
      race.time = s.tm;
    }
    race.pickups = s.pk.map((p) => ({ x: p[0], y: p[1], type: p[2] ? 'cash' : 'nitro', t: p[3] }));

    for (const a of s.k) {
      const t = race.trucks.find((k) => k.slot === a[0]);
      if (!t) continue;
      const own = t.slot === this.mySlot && !a[13];
      const dx = a[1] - t.x;
      const dy = a[2] - t.y;
      const err = Math.hypot(dx, dy);
      const k = err > 40 ? 1 : own ? (err < 4 ? 0.06 : 0.25) : 0.4;
      t.x += dx * k;
      t.y += dy * k;
      t.vx += (a[5] - t.vx) * k;
      t.vy += (a[6] - t.vy) * k;
      t.h += wrapAngle(a[7] - t.h) * k;
      if (!own || k === 1) {
        t.z = a[3];
        t.vz = a[4];
      }

      if (a[8] > t.lap && a[8] > 1 && a[8] <= race.laps) race.events.push({ type: 'lap', slot: t.slot });
      t.lap = a[8];
      t.pos = a[9];
      const seen = this.seenNitro[t.slot] ?? a[10];
      if (a[10] > seen || a[12] > t.cash) race.events.push({ type: 'pickup', slot: t.slot });
      this.seenNitro[t.slot] = a[10];
      t.nitro = a[10];
      t.nitroT = own ? (a[11] > 0 ? a[11] : t.nitroT) : a[11];
      t.cash = a[12];
      if (a[13] && !t.finished) race.events.push({ type: 'finish', slot: t.slot });
      t.finished = !!a[13];
      t.place = a[14];
      const c = this.controls[t.slot];
      c.steer = a[15];
      c.gas = a[16];
      c.brake = a[17];
      c.nitro = !!a[18];
      t.idx = a[19];
      t.cp = a[20];
      t.passed = a[21];
      t.finishTime = a[22];
    }
  }
}
