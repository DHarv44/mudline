import { TrackDef, DIRT, MUD, WATER, JUMP, WHOOPS, FeatureType } from '../content/tracks';

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
  /** Signed distance to the track edge per pixel: negative is drivable. */
  sd: Float32Array;
  near: Uint16Array;
  surf: Uint8Array;
}

const SPACING = 2;
const FAR = 8;
const SURF: Record<FeatureType, number> = { mud: MUD, water: WATER, jump: JUMP, whoops: WHOOPS };
const DEF_LEN: Record<FeatureType, number> = { mud: 44, water: 34, jump: 12, whoops: 64 };

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

export function buildTrack(def: TrackDef): Track {
  const w = def.long ? 960 : 480;
  const h = def.long ? 540 : 270;
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

  const sampleSurf = new Uint8Array(n);
  const sampleRel = new Float32Array(n);
  const sampleShade = new Uint8Array(n);
  for (const f of def.features) {
    const i0 = Math.round(f.at * n);
    const count = Math.max(2, Math.round((f.len ?? DEF_LEN[f.type]) / SPACING));
    for (let k = 0; k < count; k++) {
      const i = (i0 + k) % n;
      sampleSurf[i] = SURF[f.type];
      sampleRel[i] = k / (count - 1);
    }
    if (f.type === 'jump') for (let k = 0; k < 3; k++) sampleShade[(i0 + count + k) % n] = 1;
  }

  const half = def.half;
  const sd = new Float32Array(w * h).fill(FAR);
  const near = new Uint16Array(w * h);
  const R = half + FAR;
  for (let i = 0; i < n; i++) {
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

  return { def, w, h, n, half, sx, sy, tx, ty, sampleSurf, sampleRel, sampleShade, sd, near, surf };
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

/** Signed sample-index difference a-b, wrapped to (-n/2, n/2]. */
export function wrapIdx(t: Track, d: number): number {
  const n = t.n;
  d = ((d % n) + n) % n;
  return d > n / 2 ? d - n : d;
}
