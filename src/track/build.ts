import { CourseProfile, TrackDef, DIRT, MUD, WATER, JUMP, WHOOPS, SAND, FeatureType } from '../content/types';
import { findCrossings, layCourse } from './course';

export interface Track {
  def: TrackDef;
  w: number;
  h: number;
  /** Number of centreline samples, spaced ~2px. */
  n: number;
  half: number;
  sx: Float32Array;
  sy: Float32Array;
  tx: Float32Array;
  ty: Float32Array;
  sampleSurf: Uint8Array;
  /** 0..1 position inside the feature the sample belongs to. */
  sampleRel: Float32Array;
  /** 1 on the few samples just past a jump lip (drawn as a drop shadow). */
  sampleShade: Uint8Array;
  /** Launch strength of the jump a sample belongs to. */
  samplePow: Float32Array;
  /** Signed distance to the track edge per pixel: negative is drivable. */
  sd: Float32Array;
  near: Uint16Array;
  surf: Uint8Array;
  /** 1 on samples that are up on a bridge deck. */
  level: Uint8Array;
  spans: Span[];
  /** 1 where nothing should be built or dropped: on, under and beside bridges. */
  blocked: Uint8Array;
  /** True when vehicles are held to their own stretch of track (needed for bridges). */
  local: boolean;
}

/** A bridge deck: its middle sample and how many samples it reaches either way. */
export interface Span { at: number; half: number }

const SPACING = 2;
const FAR = 10;
const SURF: Record<FeatureType, number> = { mud: MUD, water: WATER, jump: JUMP, whoops: WHOOPS, sand: SAND };
const DEF_LEN: Record<FeatureType, number> = { mud: 44, water: 34, jump: 12, whoops: 64, sand: 90 };

function cr(a: number, b: number, c: number, d: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
}

function resample(points: [number, number][]): { xs: number[]; ys: number[] } {
  const m = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const SUB = 24;
  for (let i = 0; i < m; i++) {
    const p0 = points[(i + m - 1) % m];
    const p1 = points[i];
    const p2 = points[(i + 1) % m];
    const p3 = points[(i + 2) % m];
    for (let k = 0; k < SUB; k++) {
      const t = k / SUB;
      dx.push(cr(p0[0], p1[0], p2[0], p3[0], t));
      dy.push(cr(p0[1], p1[1], p2[1], p3[1], t));
    }
  }
  const dn = dx.length;
  const cum = [0];
  for (let i = 0; i < dn; i++) {
    const j = (i + 1) % dn;
    cum.push(cum[i] + Math.hypot(dx[j] - dx[i], dy[j] - dy[i]));
  }
  const total = cum[dn];
  const n = Math.round(total / SPACING);
  const xs: number[] = [];
  const ys: number[] = [];
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const d = (i / n) * total;
    while (cum[seg + 1] < d) seg++;
    const f = (d - cum[seg]) / Math.max(1e-6, cum[seg + 1] - cum[seg]);
    const j = (seg + 1) % dn;
    xs.push(dx[seg] + (dx[j] - dx[seg]) * f);
    ys.push(dy[seg] + (dy[j] - dy[seg]) * f);
  }
  return { xs, ys };
}

export interface BuildOpts {
  /** Rebuild the jumps and whoops to this class profile; `key` makes each class's layout its own. */
  course?: CourseProfile;
  key?: string;
  /** Turn every crossover into a bridge, with each vehicle held to its own stretch of track. */
  bridges?: boolean;
}

export function buildTrack(def: TrackDef, opts: BuildOpts = {}): Track {
  const w = def.size?.[0] ?? 480;
  const h = def.size?.[1] ?? 270;
  const { xs, ys } = resample(def.points);
  const n = xs.length;
  const sx = Float32Array.from(xs);
  const sy = Float32Array.from(ys);
  const tx = new Float32Array(n);
  const ty = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n;
    const b = (i + 1) % n;
    const l = Math.hypot(sx[b] - sx[a], sy[b] - sy[a]) || 1;
    tx[i] = (sx[b] - sx[a]) / l;
    ty[i] = (sy[b] - sy[a]) / l;
  }

  const half = def.half;
  const line = { n, half, sx, sy, tx, ty };
  const level = new Uint8Array(n);
  const blocked = new Uint8Array(n);
  const spans: Span[] = [];
  if (opts.bridges) {
    for (const c of findCrossings(line)) {
      spans.push({ at: c.upper, half: c.span });
      for (let k = -c.span; k <= c.span; k++) level[(c.upper + k + n) % n] = 1;
      for (let k = -c.span - 14; k <= c.span + 14; k++) {
        blocked[(c.upper + k + n) % n] = 1;
        blocked[(c.lower + k + n) % n] = 1;
      }
    }
  }
  let features = def.features;
  if (opts.course) {
    // Hazards stay where the track's author put them, unless a bridge now stands there.
    const hazards = def.features.filter((f) => f.type !== 'jump' && f.type !== 'whoops' && !blocked[Math.round(f.at * n) % n]);
    const taken = blocked.slice();
    for (const f of hazards) {
      const i0 = Math.round(f.at * n);
      const count = Math.round((f.len ?? DEF_LEN[f.type]) / SPACING);
      for (let k = -8; k < count + 8; k++) taken[(i0 + k + n) % n] = 1;
    }
    features = [...hazards, ...layCourse(line, opts.course, taken, `${def.id}/${opts.key ?? ''}`)];
  }

  const sampleSurf = new Uint8Array(n);
  const sampleRel = new Float32Array(n);
  const sampleShade = new Uint8Array(n);
  const samplePow = new Float32Array(n).fill(1);
  for (const f of features) {
    const i0 = Math.round(f.at * n);
    const count = Math.max(2, Math.round((f.len ?? DEF_LEN[f.type]) / SPACING));
    for (let k = 0; k < count; k++) {
      const i = (i0 + k) % n;
      sampleSurf[i] = SURF[f.type];
      sampleRel[i] = k / (count - 1);
      samplePow[i] = f.power ?? 1;
    }
    if (f.type === 'jump') for (let k = 0; k < 3; k++) sampleShade[(i0 + count + k) % n] = 1;
  }

  const sd = new Float32Array(w * h).fill(FAR);
  const near = new Uint16Array(w * h);
  const R = half + FAR;
  for (let i = 0; i < n; i++) {
    // The ground map leaves bridge decks out, so the road beneath runs through unbroken.
    if (level[i]) continue;
    const x0 = Math.max(0, Math.floor(sx[i] - R));
    const x1 = Math.min(w - 1, Math.ceil(sx[i] + R));
    const y0 = Math.max(0, Math.floor(sy[i] - R));
    const y1 = Math.min(h - 1, Math.ceil(sy[i] + R));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - sx[i], y + 0.5 - sy[i]) - half;
        const p = y * w + x;
        if (d < sd[p]) {
          sd[p] = d;
          near[p] = i;
        }
      }
    }
  }
  const surf = new Uint8Array(w * h);
  for (let p = 0; p < surf.length; p++) surf[p] = sd[p] < 0 ? sampleSurf[near[p]] : DIRT;

  return {
    def, w, h, n, half, sx, sy, tx, ty, sampleSurf, sampleRel, sampleShade, samplePow, sd, near, surf,
    level, spans, blocked, local: !!opts.bridges,
  };
}

export interface Nearest { j: number; d: number; nx: number; ny: number }

/**
 * The nearest centreline sample to a point, looking only along the stretch of track around `idx`.
 * `d` is the signed distance to that stretch's edge and (nx, ny) points away from its centre.
 * This is what keeps a vehicle on a bridge from "seeing" the road underneath, and the other way round.
 */
export function localNearest(t: Track, idx: number, x: number, y: number, out: Nearest): void {
  const n = t.n;
  const base = Math.round(idx);
  let best = base % n;
  let bd = Infinity;
  for (let k = -14; k <= 34; k++) {
    const i = (base + k + n * 2) % n;
    const d = (t.sx[i] - x) ** 2 + (t.sy[i] - y) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  if (bd > (t.half * 2.4) ** 2) {
    for (let i = 0; i < n; i += 2) {
      const d = (t.sx[i] - x) ** 2 + (t.sy[i] - y) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
  }
  const dist = Math.sqrt(bd);
  out.j = best;
  out.d = dist - t.half;
  out.nx = dist > 1e-4 ? (x - t.sx[best]) / dist : 0;
  out.ny = dist > 1e-4 ? (y - t.sy[best]) / dist : 0;
}

/** Bilinear signed distance to the track edge. */
export function sdAt(t: Track, x: number, y: number): number {
  const fx = Math.min(t.w - 1.001, Math.max(0, x - 0.5));
  const fy = Math.min(t.h - 1.001, Math.max(0, y - 0.5));
  const x0 = fx | 0;
  const y0 = fy | 0;
  const ax = fx - x0;
  const ay = fy - y0;
  const p = y0 * t.w + x0;
  const a = t.sd[p] + (t.sd[p + 1] - t.sd[p]) * ax;
  const b = t.sd[p + t.w] + (t.sd[p + t.w + 1] - t.sd[p + t.w]) * ax;
  return a + (b - a) * ay;
}

export function surfAt(t: Track, x: number, y: number): number {
  const xi = Math.min(t.w - 1, Math.max(0, x | 0));
  const yi = Math.min(t.h - 1, Math.max(0, y | 0));
  return t.surf[yi * t.w + xi];
}

/** The centreline sample closest to a point. */
export function nearAt(t: Track, x: number, y: number): number {
  const xi = Math.min(t.w - 1, Math.max(0, x | 0));
  const yi = Math.min(t.h - 1, Math.max(0, y | 0));
  return t.near[yi * t.w + xi];
}

/** Signed sample-index difference a-b, wrapped to (-n/2, n/2]. */
export function wrapIdx(t: Track, d: number): number {
  const n = t.n;
  d = ((d % n) + n) % n;
  return d > n / 2 ? d - n : d;
}
