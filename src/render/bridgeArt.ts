import { hash2 } from '../core/rng';
import type { Track } from '../track/build';

/** A painted bridge deck and its shadow, placed in the world. */
export interface Deck { art: HTMLCanvasElement; shadow: HTMLCanvasElement; x: number; y: number; w: number; h: number }

const K = 3;
const RAIL = 2.8;

/**
 * Paints each bridge as a timber deck with steel rails. Decks are drawn over the vehicles passing beneath
 * and under the ones crossing, which is what makes the crossover read as two levels.
 */
export function paintDecks(t: Track): Deck[] {
  return t.spans.map((span) => {
    const n = t.n;
    const ids: number[] = [];
    for (let k = -span.half; k <= span.half; k++) ids.push((span.at + k + n) % n);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const i of ids) {
      x0 = Math.min(x0, t.sx[i]);
      x1 = Math.max(x1, t.sx[i]);
      y0 = Math.min(y0, t.sy[i]);
      y1 = Math.max(y1, t.sy[i]);
    }
    const pad = t.half + RAIL + 2;
    x0 = Math.floor(x0 - pad);
    y0 = Math.floor(y0 - pad);
    const w = Math.ceil(x1 + pad) - x0;
    const h = Math.ceil(y1 + pad) - y0;
    const make = () => {
      const c = document.createElement('canvas');
      c.width = w * K;
      c.height = h * K;
      return c;
    };
    const art = make();
    const shadow = make();
    const actx = art.getContext('2d')!;
    const sctx = shadow.getContext('2d')!;
    const img = actx.createImageData(art.width, art.height);
    const shd = sctx.createImageData(art.width, art.height);
    const last = ids.length - 1;
    for (let py = 0; py < art.height; py++) {
      const wy = y0 + (py + 0.5) / K;
      for (let px = 0; px < art.width; px++) {
        const wx = x0 + (px + 0.5) / K;
        let best = 0;
        let bd = Infinity;
        for (let q = 0; q <= last; q++) {
          const i = ids[q];
          const d = (t.sx[i] - wx) ** 2 + (t.sy[i] - wy) ** 2;
          if (d < bd) {
            bd = d;
            best = q;
          }
        }
        const i = ids[best];
        const along = (wx - t.sx[i]) * t.tx[i] + (wy - t.sy[i]) * t.ty[i];
        // Square ends: nothing is drawn past the first and last sample.
        if ((best === 0 && along < -1) || (best === last && along > 1)) continue;
        const d = Math.sqrt(bd) - t.half;
        if (d > RAIL) continue;
        // The deck fades into the dirt road at each end.
        const alpha = Math.min(1, Math.min(best, last - best) / 4 + 0.15);
        const s = best * 2 + along;
        let r: number, g: number, b: number;
        if (d > 0) {
          const post = Math.abs(((s / 7) % 1) - 0.5) < 0.12;
          const lit = post ? 1.15 : 0.82 + 0.3 * Math.sin((Math.PI * d) / RAIL);
          r = 176 * lit;
          g = 182 * lit;
          b = 196 * lit;
        } else {
          const plank = ((s / 3.2) % 1) < 0.14 ? 0.72 : 1;
          const grain = 0.9 + 0.2 * hash2(Math.floor(s / 3.2), Math.floor((d + 40) * 2));
          const beam = d > -2.2 ? 0.74 : 1;
          const crown = 0.92 + 0.12 * Math.sin((Math.PI * best) / last);
          const lit = plank * grain * beam * crown;
          r = 158 * lit;
          g = 122 * lit;
          b = 82 * lit;
        }
        const o = (py * art.width + px) * 4;
        img.data[o] = r;
        img.data[o + 1] = g;
        img.data[o + 2] = b;
        img.data[o + 3] = 255 * alpha;
        shd.data[o + 3] = 110 * alpha;
      }
    }
    actx.putImageData(img, 0, 0);
    sctx.putImageData(shd, 0, 0);
    return { art, shadow, x: x0, y: y0, w, h };
  });
}
