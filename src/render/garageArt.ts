import { VIEW_H, VIEW_W } from '../core/config';
import type { RGB } from '../content/themes';
import type { Catalog, PartVisual, Upgrades, VehicleDef } from '../content/types';
import type { Screen } from './screen';
import { tokenColor } from './sprites';

const css = (c: RGB): string => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

/** How far along its ladder each kind of visible part is, 0..1, read from the catalogue. */
export function partLook(cat: Catalog, up: Upgrades): Record<PartVisual, number> {
  const out: Record<PartVisual, number> = { wheel: 0, ride: 0, exhaust: 0, bottle: 0, none: 0 };
  for (const c of cat.categories) {
    const f = (up[c.id] ?? 0) / Math.max(1, c.tiers.length - 1);
    out[c.visual] = Math.max(out[c.visual], f);
  }
  return out;
}

const FLOOR = 196;

/** The workshop bay: back wall, pegboard, tyre rack, lift and a work lamp over it. */
export function drawBay(s: Screen, time: number): void {
  const c = s.ctx;
  s.rect(0, 0, VIEW_W, FLOOR - 26, '#1c2230');
  for (let x = 0; x < VIEW_W; x += 40) s.rect(x, 0, 1, FLOOR - 26, '#161b27');
  for (let y = 24; y < FLOOR - 26; y += 36) s.rect(0, y, VIEW_W, 1, '#242b3b');
  s.rect(0, FLOOR - 26, VIEW_W, 4, '#0f121a');
  s.rect(0, FLOOR - 22, VIEW_W, VIEW_H - FLOOR + 22, '#3a3d44');
  for (let i = 0; i < 9; i++) {
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.beginPath();
    c.moveTo(140 + (i - 4) * 34, FLOOR - 22);
    c.lineTo(140 + (i - 4) * 90, VIEW_H);
    c.lineTo(140 + (i - 4) * 90 + 2, VIEW_H);
    c.lineTo(140 + (i - 4) * 34 + 1, FLOOR - 22);
    c.fill();
  }
  // Pegboard with tools.
  s.rect(14, 44, 62, 70, '#4a3f33');
  s.rect(16, 46, 58, 66, '#5a4d3e');
  const tools: [number, number, number, number][] = [[22, 52, 3, 30], [30, 52, 8, 4], [33, 56, 2, 26], [44, 52, 4, 22], [42, 74, 8, 5], [56, 52, 2, 34], [53, 86, 8, 4], [64, 54, 5, 18]];
  for (const t of tools) s.rect(t[0], t[1], t[2], t[3], '#b8bcc6');
  // Tyre rack.
  s.rect(206, 50, 62, 3, '#6a6e78');
  s.rect(206, 84, 62, 3, '#6a6e78');
  for (let i = 0; i < 3; i++) {
    for (const y of [38, 72]) {
      c.fillStyle = '#16161a';
      c.beginPath();
      c.arc(218 + i * 19, y, 11, 0, 6.3);
      c.fill();
      c.fillStyle = '#34343c';
      c.beginPath();
      c.arc(218 + i * 19, y, 5, 0, 6.3);
      c.fill();
    }
  }
  // Tool chest.
  s.rect(14, FLOOR - 66, 46, 44, '#a02c24');
  for (let i = 0; i < 4; i++) {
    s.rect(17, FLOOR - 62 + i * 10, 40, 8, '#c03a30');
    s.rect(32, FLOOR - 59 + i * 10, 10, 2, '#e8d8c0');
  }
  // Lift.
  s.rect(52, FLOOR, 176, 6, '#d8b020');
  for (let x = 52; x < 228; x += 16) s.rect(x, FLOOR, 8, 6, '#22201c');
  s.rect(72, FLOOR + 6, 10, 20, '#5c6068');
  s.rect(198, FLOOR + 6, 10, 20, '#5c6068');
  // Lamp, with a slow flicker so the bay feels lit rather than painted.
  const glow = 0.2 + 0.015 * Math.sin(time * 9);
  const cone = c.createLinearGradient(0, 52, 0, FLOOR);
  cone.addColorStop(0, `rgba(255,236,180,${glow + 0.12})`);
  cone.addColorStop(1, 'rgba(255,236,180,0)');
  c.fillStyle = cone;
  c.beginPath();
  c.moveTo(128, 54);
  c.lineTo(152, 54);
  c.lineTo(250, FLOOR);
  c.lineTo(30, FLOOR);
  c.fill();
  s.rect(139, 0, 2, 48, '#0c0c10');
  s.rect(126, 48, 28, 6, '#2a2c34');
  s.rect(130, 54, 20, 2, '#fff2c0');
}

/** The vehicle from the side, standing on the lift, with its fitted parts showing. */
export function drawSide(s: Screen, v: VehicleDef, body: RGB, look: Record<PartVisual, number>, bottles: number): void {
  const c = s.ctx;
  const side = v.side;
  const scale = Math.min(3, 150 / (side.wheelbase + side.wheelR * 2 + 14));
  const R = (side.wheelR + 1.6 * look.wheel) * scale;
  const ride = (1 + 5 * look.ride) * scale;
  const ax = 140 - (side.wheelbase * scale) / 2;
  const ay = FLOOR - R;
  const px = (x: number) => ax + x * scale;
  const py = (y: number) => ay + y * scale - ride;

  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath();
  c.ellipse(140, FLOOR + 2, (side.wheelbase * scale) / 2 + R + 6, 4, 0, 0, 6.3);
  c.fill();

  // Exhaust: longer and fatter as the engine is built up, with a second pipe at the top.
  const [ex, ey] = side.exhaust;
  const len = (5 + 9 * look.exhaust) * scale;
  const fat = (1.4 + 1.2 * look.exhaust) * scale;
  for (let i = 0; i < (look.exhaust > 0.9 ? 2 : 1); i++) {
    c.fillStyle = '#9a9ea8';
    c.fillRect(px(ex) - len, py(ey) + i * fat * 1.4, len, fat);
    c.fillStyle = '#20202a';
    c.fillRect(px(ex) - len, py(ey) + i * fat * 1.4, scale, fat);
  }
  // Shocks reach from each axle up into the body.
  for (const x of [0, side.wheelbase]) {
    c.fillStyle = look.ride > 0.4 ? '#e0b020' : '#70747e';
    c.fillRect(px(x) - scale, ay - ride - 8 * scale, 2 * scale, ride + 8 * scale);
  }
  for (const shape of side.shapes) {
    c.fillStyle = css(tokenColor(shape[0], body, shape[1]));
    c.beginPath();
    for (let i = 2; i < shape.length; i++) {
      const p = shape[i] as [number, number];
      if (i === 2) c.moveTo(px(p[0]), py(p[1]));
      else c.lineTo(px(p[0]), py(p[1]));
    }
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(8,8,12,0.55)';
    c.lineWidth = 1;
    c.stroke();
  }
  // Nitro bottles carried aboard.
  const [bx, by] = side.bottle;
  const bw = (2.4 + 1.2 * look.bottle) * scale;
  for (let i = 0; i < Math.min(4, bottles); i++) {
    c.fillStyle = '#38b8ff';
    c.fillRect(px(bx) + i * (bw + scale), py(by) - 6 * scale, bw, 6 * scale);
    c.fillStyle = '#d8f0ff';
    c.fillRect(px(bx) + i * (bw + scale), py(by) - 6 * scale, bw, scale);
  }
  // Wheels: knobs get deeper and more numerous with better tyres.
  const knobs = 12 + Math.round(8 * look.wheel);
  const depth = (1 + 1.6 * look.wheel) * scale;
  for (const x of [0, side.wheelbase]) {
    const wx = px(x);
    c.fillStyle = '#101014';
    for (let k = 0; k < knobs; k++) {
      const a = (k / knobs) * Math.PI * 2;
      c.save();
      c.translate(wx + Math.cos(a) * R, ay + Math.sin(a) * R);
      c.rotate(a);
      c.fillRect(-depth, -scale, depth * 2, 2 * scale);
      c.restore();
    }
    c.beginPath();
    c.arc(wx, ay, R, 0, 6.3);
    c.fill();
    c.fillStyle = '#2a2a32';
    c.beginPath();
    c.arc(wx, ay, R * 0.82, 0, 6.3);
    c.fill();
    c.fillStyle = '#b8bcc8';
    c.beginPath();
    c.arc(wx, ay, R * 0.5, 0, 6.3);
    c.fill();
    c.fillStyle = '#50545e';
    c.beginPath();
    c.arc(wx, ay, R * 0.2, 0, 6.3);
    c.fill();
  }
}
