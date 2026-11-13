import type { RGB } from '../content/themes';
import { TRUCK_COLORS } from '../content/trucks';

export const FRAME = 24;
export const ANGLES = 32;
const CX = 12;
const CY = 15;

type Rect = [number, number, number, number, RGB];

function shade(c: RGB, f: number): RGB {
  return [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
}

function wheels(c: RGB): Rect[] {
  return [
    [-6.5, -5.6, -2.5, -3.2, c], [2.5, -5.6, 6.5, -3.2, c],
    [-6.5, 3.2, -2.5, 5.6, c], [2.5, 3.2, 6.5, 5.6, c],
  ];
}

/** The truck as a stack of flat slices, bottom first; drawn each one pixel higher for a chunky 3D look. */
function model(body: RGB): Rect[][] {
  const tyre: RGB = [26, 26, 30];
  const tread: RGB = [66, 66, 74];
  const chassis: RGB = [44, 40, 44];
  const glass: RGB = [36, 52, 92];
  const full: Rect = [-7, -3.5, 7, 3.5, body];
  return [
    wheels(tyre),
    wheels(tyre),
    [...wheels(tread), [-6.5, -3, 6.5, 3, chassis]],
    [[-7, -3.5, 7, 3.5, shade(body, 0.55)]],
    [[-7, -3.5, 7, 3.5, shade(body, 0.78)]],
    [full, [-6, -2.5, -1.5, 2.5, [58, 50, 50]], [3.5, -3, 7, 3, shade(body, 1.18)]],
    [[-1, -3, 3.5, 3, glass]],
    [[-1, -3, 3.5, 3, shade(body, 1.25)], [0.5, -2, 2.5, 2, shade(body, 1.05)]],
  ];
}

function raster(layers: Rect[][], outline: boolean, alpha = 255): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = FRAME * ANGLES;
  cv.height = FRAME;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(cv.width, cv.height);
  const d = img.data;
  for (let a = 0; a < ANGLES; a++) {
    const ang = (a / ANGLES) * Math.PI * 2;
    const cs = Math.cos(ang);
    const sn = Math.sin(ang);
    const ox = a * FRAME;
    for (let z = 0; z < layers.length; z++) {
      for (let py = 0; py < FRAME; py++) {
        for (let pxl = 0; pxl < FRAME; pxl++) {
          const dx = pxl + 0.5 - CX;
          const dy = py + 0.5 - (CY - z);
          const lx = dx * cs + dy * sn;
          const ly = -dx * sn + dy * cs;
          for (const r of layers[z]) {
            if (lx >= r[0] && lx < r[2] && ly >= r[1] && ly < r[3]) {
              const o = (py * cv.width + ox + pxl) * 4;
              d[o] = r[4][0];
              d[o + 1] = r[4][1];
              d[o + 2] = r[4][2];
              d[o + 3] = alpha;
            }
          }
        }
      }
    }
    if (outline) {
      const edge: number[] = [];
      for (let py = 0; py < FRAME; py++) {
        for (let pxl = 0; pxl < FRAME; pxl++) {
          const o = (py * cv.width + ox + pxl) * 4;
          if (d[o + 3]) continue;
          const hit =
            (pxl > 0 && d[o - 4 + 3]) || (pxl < FRAME - 1 && d[o + 4 + 3]) ||
            (py > 0 && d[o - cv.width * 4 + 3]) || (py < FRAME - 1 && d[o + cv.width * 4 + 3]);
          if (hit) edge.push(o);
        }
      }
      for (const o of edge) {
        d[o] = 16;
        d[o + 1] = 12;
        d[o + 2] = 16;
        d[o + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export interface TruckSprites { sheet: HTMLCanvasElement; shadow: HTMLCanvasElement }

const cache: (TruckSprites | undefined)[] = [];
let shadowSheet: HTMLCanvasElement | undefined;

export function truckSprites(slot: number): TruckSprites {
  let s = cache[slot];
  if (!s) {
    shadowSheet ??= raster([[[-7, -5.6, 7, 5.6, [0, 0, 0]]]], false, 90);
    s = { sheet: raster(model(TRUCK_COLORS[slot].rgb), true), shadow: shadowSheet };
    cache[slot] = s;
  }
  return s;
}

export function frameFor(heading: number): number {
  const f = Math.round((heading / (Math.PI * 2)) * ANGLES) % ANGLES;
  return f < 0 ? f + ANGLES : f;
}

/** Draws a truck at world position (x, y), `lift` pixels above its shadow. */
export function drawTruck(ctx: CanvasRenderingContext2D, slot: number, x: number, y: number, heading: number, lift = 0, size = 1): void {
  const s = truckSprites(slot);
  const f = frameFor(heading) * FRAME;
  const w = FRAME * size;
  ctx.drawImage(s.shadow, f, 0, FRAME, FRAME, x - CX * size + 1 + lift * 0.4, y - CY * size + 2 * size, w, w);
  ctx.drawImage(s.sheet, f, 0, FRAME, FRAME, x - CX * size, y - CY * size - lift, w, w);
}
