import { hash2 } from '../core/rng';
import { CROWD, RGB, THEMES } from '../content/themes';
import { JUMP, MUD, SAND, WATER, WHOOPS } from '../content/types';
import { nearAt, sdAt, Track } from '../track/build';

const mix = (a: RGB, b: RGB, f: number): RGB => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const lit = (a: RGB, f: number): RGB => [a[0] * f, a[1] * f, a[2] * f];
const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Smooth value noise in 0..1. */
function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

const fbm = (x: number, y: number): number => noise(x, y) * 0.55 + noise(x * 2.3 + 17, y * 2.3 + 5) * 0.3 + noise(x * 5.1 + 3, y * 5.1 + 41) * 0.15;

// Light comes from the top left; shadows fall to the bottom right.
const SX = 0.6;
const SY = 0.8;
const SAND_COL: RGB = [238, 220, 170];

/**
 * Paints a track at `k` art pixels per world pixel with soft dirt, lit barriers and cast shadows.
 * Same layout, palette and features as the retro painter; only the rendering differs.
 */
export function paintModern(t: Track, k: number): HTMLCanvasElement {
  const th = THEMES[t.def.theme] ?? THEMES.stadium;
  const W = Math.round(t.w * k);
  const H = Math.round(t.h * k);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const px = img.data;
  const n = t.n;
  const border = 12;

  for (let ay = 0; ay < H; ay++) {
    const wy = (ay + 0.5) / k;
    for (let ax = 0; ax < W; ax++) {
      const wx = (ax + 0.5) / k;
      const d = sdAt(t, wx, wy);
      const n1 = fbm(wx * 0.06, wy * 0.06);
      const n2 = noise(wx * 0.9, wy * 0.9);
      let c: RGB;
      let gx = 0;
      let gy = 0;
      if (d > -7 && d < 9.5) {
        gx = sdAt(t, wx + 1, wy) - sdAt(t, wx - 1, wy);
        gy = sdAt(t, wx, wy + 1) - sdAt(t, wx, wy - 1);
        const gl = Math.hypot(gx, gy) || 1;
        gx /= gl;
        gy /= gl;
      }
      if (d < 0) {
        const i = nearAt(t, wx, wy);
        const s = t.sampleSurf[i];
        const rel = t.sampleRel[i];
        const dirt = lit(mix(th.dirt[2], th.dirt[0], 0.2 + 0.6 * n1), 0.94 + 0.12 * n2);
        c = lit(dirt, 0.97 + 0.03 * Math.cos(d * 0.9));
        if (s !== 0) {
          // Features fade in and out along the track instead of ending on a hard line.
          const fade = s === JUMP ? 1 : Math.min(1, smooth(0, 0.12, rel), smooth(1, 0.88, rel));
          let f: RGB = c;
          if (s === MUD) {
            f = mix(th.mud[1], th.mud[0], n1);
            if (n2 > 0.82) f = lit(f, 1.5);
          } else if (s === WATER) {
            f = mix(th.water[1], th.water[0], n1);
            if (Math.sin((wx + wy * 0.6) * 0.9 + n1 * 7) > 0.9) f = mix(f, th.water[2], 0.7);
          } else if (s === SAND) {
            f = lit(mix(SAND_COL, th.dirt[0], 0.3), 0.95 + 0.07 * Math.sin(wy * 1.3 + n1 * 9));
          } else if (s === JUMP) {
            f = lit(dirt, 1 + 0.3 * rel);
            if (rel > 0.82) f = lit(dirt, 1.42);
          } else if (s === WHOOPS) {
            f = lit(dirt, 1 + 0.2 * Math.sin(rel * Math.PI * 12));
          }
          c = mix(c, f, fade);
        }
        if (t.sampleShade[i]) c = lit(c, 0.62);
        if (i <= 1 || i >= n - 1) c = (Math.floor(wx / 2.5) + Math.floor(wy / 2.5)) % 2 ? [236, 236, 236] : [28, 28, 32];
        // A pale worn berm at the edge, and the barrier's shadow where it faces away from the light.
        c = mix(c, lit(th.dirt[0], 1.06), smooth(-6, -1, d) * 0.4);
        const shade = Math.max(0, -(gx * SX + gy * SY)) * smooth(-6, 0, d);
        c = lit(c, 1 - 0.42 * shade);
      } else if (d < 3.4) {
        const i = nearAt(t, wx, wy);
        const base = (i >> 2) % 2 ? th.barrierA : th.barrierB;
        const round = Math.sin((Math.PI * d) / 3.4);
        const face = -(gx * SX + gy * SY);
        c = lit(base, 0.62 + 0.3 * round + 0.28 * face);
        if (i % 4 === 0) c = lit(c, 0.7);
      } else {
        const edge = Math.min(wx, wy, t.w - wx, t.h - wy);
        if (edge < border) {
          const cell = hash2(Math.floor(wx / 2), Math.floor(wy / 2));
          const dot = Math.hypot((wx % 2) - 1, (wy % 2) - 1);
          c = mix([24, 22, 30], CROWD[(cell * CROWD.length) | 0], dot < 0.8 ? 0.85 : 0.15);
          c = lit(c, 0.55 + 0.45 * (edge / border));
        } else if (edge < border + 1.6) {
          c = [224, 224, 216];
        } else {
          c = lit(mix(th.ground[2], th.ground[0], n1), 0.93 + 0.14 * n2);
          const tuft = hash2(Math.floor(wx / 5), Math.floor(wy / 5));
          if (tuft > 0.9 && noise(wx * 0.5, wy * 0.5) > 0.55) c = lit(c, tuft > 0.95 ? 1.18 : 0.82);
          // Stands at the rim sink into shade.
          c = lit(c, 0.8 + 0.2 * smooth(border, border + 26, edge));
        }
        if (d < 9.5) c = lit(c, 1 - 0.5 * Math.max(0, gx * SX + gy * SY) * (1 - smooth(3.4, 9.5, d)));
      }
      const o = (ay * W + ax) * 4;
      px[o] = c[0];
      px[o + 1] = c[1];
      px[o + 2] = c[2];
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
