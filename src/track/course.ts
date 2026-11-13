import { mulberry32 } from '../core/rng';
import type { CourseProfile, Feature } from '../content/types';

export interface Line {
  n: number;
  half: number;
  sx: Float32Array;
  sy: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
}

export interface Crossing { lower: number; upper: number; span: number }

/** Where the centreline passes over itself. The two passes take turns going over, so a knot weaves. */
export function findCrossings(l: Line): Crossing[] {
  const { n, sx, sy, tx, ty } = l;
  const minArc = 40;
  const found: { i: number; j: number; d: number; sin: number }[] = [];
  for (let i = 0; i < n; i += 2) {
    for (let j = i + minArc; j < n; j++) {
      if (n - j + i < minArc) break;
      const d = (sx[i] - sx[j]) ** 2 + (sy[i] - sy[j]) ** 2;
      if (d > 9) continue;
      const sin = Math.abs(tx[i] * ty[j] - ty[i] * tx[j]);
      if (sin < 0.35) continue;
      const last = found[found.length - 1];
      if (last && Math.abs(i - last.i) < 16 && Math.abs(j - last.j) < 16) {
        if (d < last.d) found[found.length - 1] = { i, j, d, sin };
      } else {
        found.push({ i, j, d, sin });
      }
    }
  }
  // In lap order of first arrival, alternating which pass is on top.
  return found.map((f, k) => {
    const span = Math.ceil(((l.half + 7) / f.sin + 8) / 2);
    return k % 2 === 0 ? { lower: f.i, upper: f.j, span } : { lower: f.j, upper: f.i, span };
  });
}

function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Fits jumps and whoops to a track for one class. Straights are found from the centreline's curvature and
 * built on to the class's profile, so nothing lands on a corner, on the start, on a bridge or on a hazard.
 */
export function layCourse(l: Line, p: CourseProfile, blocked: Uint8Array, key: string): Feature[] {
  const { n, tx, ty } = l;
  const rand = mulberry32(hashOf(key));
  const straight = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i + n - 7) % n;
    const b = (i + 7) % n;
    const dot = tx[a] * tx[b] + ty[a] * ty[b];
    straight[i] = dot > 0.975 && !blocked[i] ? 1 : 0;
  }
  // Keep clear of the start line and the grid behind it.
  for (let k = -24; k <= 26; k++) straight[(k + n) % n] = 0;

  const out: Feature[] = [];
  let i = 0;
  while (i < n) {
    if (!straight[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && straight[j]) j++;
    const from = i + 6;
    const run = (j - i) * 2 - 24;
    i = j;
    if (run < p.minRun) continue;
    // Some straights are left clean, so a lap has room to breathe.
    if (rand() < 0.28) continue;
    const put = (at: number, f: Omit<Feature, 'at'>) => out.push({ at: (from + at / 2) / n, ...f });
    if (rand() < p.whoops && run >= 70) {
      const len = Math.min(run - 8, 50 + rand() * 60);
      put((run - len) / 2, { type: 'whoops', len });
      continue;
    }
    // Doubles, triples and longer sets are mixed up to the class's limit.
    const want = p.rhythm <= 1 ? 1 : 2 + Math.floor(rand() * (p.rhythm - 1));
    const count = Math.max(1, Math.min(want, Math.floor(run / p.gap)));
    if (count === 1) {
      // One big jump early on the straight, leaving room to land.
      put(run * 0.25, { type: 'jump', len: p.ramp, power: p.big });
      continue;
    }
    const start = (run - (count - 1) * p.gap - p.ramp) * 0.4;
    for (let k = 0; k < count; k++) {
      put(start + k * p.gap, { type: 'jump', len: p.ramp, power: k === count - 1 ? p.power * 1.15 : p.power });
    }
  }
  return out;
}
