import { TRUCK_COLORS } from '../content/drivers';
import { vehicleById } from '../content/registry';
import type { RGB } from '../content/themes';
import type { LayerRect, Token } from '../content/types';

export type Style = 'retro' | 'modern';

const FRAME = 32;
const CX = 16;
const CY = 19;

interface Sheet { sheet: HTMLCanvasElement; shadow: HTMLCanvasElement; k: number; angles: number }

const FIXED: Record<Exclude<Token, 'body' | 'helmet'>, RGB> = {
  tyre: [26, 26, 30], tread: [66, 66, 74], chassis: [44, 40, 44], glass: [36, 52, 92], bed: [58, 50, 50],
  metal: [150, 152, 162], rider: [40, 40, 50], seat: [28, 28, 34], light: [255, 240, 170],
};

/** Resolves a colour token for a given player colour. */
export function tokenColor(token: Token, body: RGB, shade = 1): RGB {
  const base: RGB = token === 'body' ? body : token === 'helmet' ? [body[0] * 0.5 + 120, body[1] * 0.5 + 120, body[2] * 0.5 + 120] : FIXED[token];
  return [Math.min(255, base[0] * shade), Math.min(255, base[1] * shade), Math.min(255, base[2] * shade)];
}

/**
 * Draws a vehicle's slice stack from every angle. `k` is the resolution: 1 gives chunky arcade pixels,
 * 2 gives the same model at twice the detail with each slice shaded by height.
 */
function raster(layers: LayerRect[][], body: RGB, k: number, angles: number, flat: boolean): HTMLCanvasElement {
  const F = FRAME * k;
  const cv = document.createElement('canvas');
  cv.width = F * angles;
  cv.height = F;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(cv.width, cv.height);
  const d = img.data;
  const W = cv.width;
  for (let a = 0; a < angles; a++) {
    const ang = (a / angles) * Math.PI * 2;
    const cs = Math.cos(ang);
    const sn = Math.sin(ang);
    const ox = a * F;
    for (let z = 0; z < layers.length; z++) {
      for (let sub = 0; sub < k; sub++) {
        const lift = Math.round((z + sub / k) * k);
        const glow = flat ? 1 : 0.86 + 0.2 * (z / layers.length);
        for (const r of layers[z]) {
          const col = flat ? [0, 0, 0] : tokenColor(r[4], body, (r[5] ?? 1) * glow);
          // Only the pixels the rotated rectangle can reach are tested.
          const reach = Math.hypot(Math.max(Math.abs(r[0]), Math.abs(r[2])), Math.max(Math.abs(r[1]), Math.abs(r[3]))) * k + 1;
          const y0 = Math.max(0, Math.floor(CY * k - lift - reach));
          const y1 = Math.min(F - 1, Math.ceil(CY * k - lift + reach));
          const x0 = Math.max(0, Math.floor(CX * k - reach));
          const x1 = Math.min(F - 1, Math.ceil(CX * k + reach));
          for (let py = y0; py <= y1; py++) {
            for (let px = x0; px <= x1; px++) {
              const dx = (px + 0.5 - CX * k) / k;
              const dy = (py + 0.5 - (CY * k - lift)) / k;
              const lx = dx * cs + dy * sn;
              const ly = -dx * sn + dy * cs;
              if (lx < r[0] || lx >= r[2] || ly < r[1] || ly >= r[3]) continue;
              const o = (py * W + ox + px) * 4;
              d[o] = col[0];
              d[o + 1] = col[1];
              d[o + 2] = col[2];
              d[o + 3] = flat ? 90 : 255;
            }
          }
        }
        if (flat) break;
      }
      if (flat) break;
    }
    if (flat) continue;
    const edge: number[] = [];
    for (let py = 0; py < F; py++) {
      for (let px = 0; px < F; px++) {
        const o = (py * W + ox + px) * 4;
        if (d[o + 3]) continue;
        const hit =
          (px > 0 && d[o - 1]) || (px < F - 1 && d[o + 7]) || (py > 0 && d[o - W * 4 + 3]) || (py < F - 1 && d[o + W * 4 + 3]);
        if (hit) edge.push(o);
      }
    }
    for (const o of edge) {
      d[o] = 16;
      d[o + 1] = 12;
      d[o + 2] = 16;
      d[o + 3] = k > 1 ? 150 : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

const cache = new Map<string, Sheet>();

function sheetFor(vehicleId: string, slot: number, style: Style): Sheet {
  const key = `${vehicleId}/${slot}/${style}`;
  let s = cache.get(key);
  if (!s) {
    const v = vehicleById(vehicleId);
    const k = style === 'modern' ? 2 : 1;
    const angles = style === 'modern' ? 64 : 32;
    // The shadow is the outline of the widest low slices.
    const foot: LayerRect[][] = [v.layers.slice(0, 4).flat()];
    s = { sheet: raster(v.layers, TRUCK_COLORS[slot].rgb, k, angles, false), shadow: raster(foot, [0, 0, 0], k, angles, true), k, angles };
    cache.set(key, s);
  }
  return s;
}

/** Draws a vehicle at world position (x, y), `lift` pixels above its shadow. */
export function drawVehicle(
  ctx: CanvasRenderingContext2D, vehicleId: string, slot: number, style: Style,
  x: number, y: number, heading: number, lift = 0, size = 1,
): void {
  const s = sheetFor(vehicleId, slot, style);
  let f = Math.round((heading / (Math.PI * 2)) * s.angles) % s.angles;
  if (f < 0) f += s.angles;
  const F = FRAME * s.k;
  const w = FRAME * size;
  ctx.drawImage(s.shadow, f * F, 0, F, F, x - CX * size + (1 + lift * 0.4) * size, y - CY * size + 2 * size, w, w);
  ctx.drawImage(s.sheet, f * F, 0, F, F, x - CX * size, y - CY * size - lift, w, w);
}
