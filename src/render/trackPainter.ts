import { hash2 } from '../core/rng';
import { CROWD, RGB, THEMES } from '../content/themes';
import { JUMP, MUD, WATER, WHOOPS } from '../content/tracks';
import type { Track } from '../track/build';

function mix(a: RGB, b: RGB, f: number): RGB {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function scale(a: RGB, f: number): RGB {
  return [Math.min(255, a[0] * f), Math.min(255, a[1] * f), Math.min(255, a[2] * f)];
}

const BORDER = 10;

/** Paints the whole track as pixel art, one pixel at a time, from the distance field. */
export function paintTrack(t: Track): HTMLCanvasElement {
  const th = THEMES[t.def.theme] ?? THEMES.stadium;
  const cv = document.createElement('canvas');
  cv.width = t.w;
  cv.height = t.h;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(t.w, t.h);
  const px = img.data;
  const n = t.n;

  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const p = y * t.w + x;
      const d = t.sd[p];
      const i = t.near[p];
      const r = hash2(x, y);
      let c: RGB;
      if (d < 0) {
        const s = t.sampleSurf[i];
        const rel = t.sampleRel[i];
        if (s === MUD) {
          c = r < 0.3 ? th.mud[1] : th.mud[0];
          if (r > 0.94) c = scale(th.mud[0], 1.35);
        } else if (s === WATER) {
          c = r < 0.25 ? th.water[0] : th.water[1];
          if (((x + (y >> 1) * 3) % 9 === 0 && y % 3 === 0) || r > 0.975) c = th.water[2];
        } else if (s === JUMP) {
          c = mix(th.dirt[1], scale(th.dirt[0], 1.18), rel);
          if (rel > 0.8) c = scale(th.dirt[0], 1.28);
        } else if (s === WHOOPS) {
          c = Math.sin(rel * Math.PI * 2 * 6) > 0 ? scale(th.dirt[0], 1.1) : th.dirt[2];
        } else {
          c = r < 0.1 ? th.dirt[2] : r > 0.9 ? th.dirt[0] : th.dirt[1];
          // Ruts that follow the shape of the track.
          if ((-d) % 7 < 1 && r > 0.35) c = scale(c, 0.92);
        }
        if (t.sampleShade[i]) c = scale(th.dirt[2], 0.72);
        if (i <= 1 || i >= n - 1) c = ((x >> 1) + (y >> 1)) % 2 ? [240, 240, 240] : [24, 24, 28];
        if (d > -1.5) c = scale(c, 0.8);
      } else if (d < 3) {
        c = (i >> 2) % 2 ? th.barrierA : th.barrierB;
        if (d > 2) c = scale(c, 0.7);
      } else if (d < 4.6) {
        c = scale(th.ground[2], 0.6);
      } else {
        const edge = Math.min(x, y, t.w - 1 - x, t.h - 1 - y);
        if (edge < BORDER) {
          const cr = hash2(x >> 1, y >> 1);
          c = CROWD[(cr * CROWD.length) | 0];
          if (((y >> 1) + (x >> 1)) % 3 === 0) c = scale(c, 0.55);
        } else if (edge < BORDER + 2) {
          c = [236, 236, 228];
        } else {
          c = r < 0.14 ? th.ground[2] : r > 0.86 ? th.ground[0] : th.ground[1];
          if (hash2(x >> 2, y >> 2) > 0.93 && r > 0.5) c = scale(th.ground[0], 1.2);
        }
      }
      const o = p * 4;
      px[o] = c[0];
      px[o + 1] = c[1];
      px[o + 2] = c[2];
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
