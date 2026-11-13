import type { Track } from './build';

export interface TrackReport {
  id: string;
  length: number;
  /** Places where two separate stretches run close and near-parallel (the barrier between them vanishes). */
  merges: { x: number; y: number; gap: number }[];
  /** Samples too close to the world edge. */
  outOfBounds: number;
  crossings: number;
}

/** Checks a built track for layout mistakes that would break barriers or lap counting. */
export function validateTrack(t: Track): TrackReport {
  const n = t.n;
  const need = t.half * 2 + 6;
  const minArc = Math.round(150 / 2);
  const merges: TrackReport['merges'] = [];
  let crossings = 0;
  let lastMerge = -100;
  let lastCross = -100;
  for (let i = 0; i < n; i += 2) {
    for (let j = i + minArc; j < n; j += 2) {
      if (n - j + i < minArc) break;
      const d = Math.hypot(t.sx[i] - t.sx[j], t.sy[i] - t.sy[j]);
      if (d >= need) continue;
      const cross = Math.abs(t.tx[i] * t.ty[j] - t.ty[i] * t.tx[j]);
      if (cross > 0.5) {
        if (d < 3 && i - lastCross > 20) {
          crossings++;
          lastCross = i;
        }
      } else if (i - lastMerge > 20) {
        merges.push({ x: Math.round(t.sx[i]), y: Math.round(t.sy[i]), gap: Math.round(d) });
        lastMerge = i;
      }
    }
  }
  const m = t.half + 5;
  let outOfBounds = 0;
  for (let i = 0; i < n; i++) {
    if (t.sx[i] < m + 10 || t.sx[i] > t.w - m - 10 || t.sy[i] < m + 12 || t.sy[i] > t.h - m - 10) outOfBounds++;
  }
  return { id: t.def.id, length: n * 2, merges, outOfBounds, crossings };
}
