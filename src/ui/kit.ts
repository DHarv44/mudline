import { VIEW_H, VIEW_W } from '../core/config';
import type { Game } from '../game/game';
import type { Screen } from '../render/screen';

/** The shared look of every menu screen: one palette, one set of panels. */
export const UI = {
  bg: '#12111a',
  bg2: '#1a1826',
  panel: '#22202f',
  panelHi: '#2e2b40',
  line: '#3c3852',
  text: '#e4e4ec',
  dim: '#8e8ea0',
  faint: '#5a5a6c',
  gold: '#ffd84a',
  amber: '#ffb020',
  fire: '#e04818',
  good: '#58e070',
  cool: '#58c8ff',
  bad: '#c05050',
};

/** Background and title bar for a menu screen. */
export function backdrop(s: Screen, title: string, sub = ''): void {
  s.rect(0, 0, VIEW_W, VIEW_H, UI.bg);
  // Faint diagonal hazard stripes, like a pit wall.
  const c = s.ctx;
  c.save();
  c.globalAlpha = 0.5;
  c.fillStyle = UI.bg2;
  for (let x = -VIEW_H; x < VIEW_W; x += 28) {
    c.beginPath();
    c.moveTo(x, VIEW_H);
    c.lineTo(x + VIEW_H, 0);
    c.lineTo(x + VIEW_H + 12, 0);
    c.lineTo(x + 12, VIEW_H);
    c.fill();
  }
  c.restore();
  s.rect(0, 0, VIEW_W, 30, '#0c0b12');
  s.rect(0, 30, VIEW_W, 2, UI.amber);
  s.rect(0, 32, VIEW_W, 1, UI.fire);
  s.text(title, 14, 8, UI.amber, { size: 16 });
  if (sub) s.text(sub, VIEW_W - 14, 12, UI.dim, { align: 'right' });
}

/** A raised panel; `on` marks the one in focus. */
export function panel(s: Screen, x: number, y: number, w: number, h: number, on = false, accent = UI.gold): void {
  s.rect(x + 2, y + 2, w, h, 'rgba(0,0,0,0.45)');
  s.rect(x, y, w, h, on ? UI.panelHi : UI.panel);
  s.rect(x, y, w, 1, on ? accent : UI.line);
  if (on) {
    s.rect(x, y + h - 1, w, 1, accent);
    s.rect(x, y, 1, h, accent);
    s.rect(x + w - 1, y, 1, h, accent);
  }
}

/** A labelled meter. `next` draws the gain a purchase would bring. */
export function statBar(s: Screen, label: string, x: number, y: number, w: number, value: number, next = value): void {
  s.text(label, x, y, UI.dim, { shadow: false });
  const bx = x + 74;
  const bw = w - 74;
  s.rect(bx, y + 1, bw, 6, '#0e0d16');
  const v = Math.max(0, Math.min(1, value));
  const n = Math.max(0, Math.min(1, next));
  if (n > v) s.rect(bx, y + 1, bw * n, 6, UI.good);
  s.rect(bx, y + 1, bw * v, 6, UI.amber);
  if (n < v) s.rect(bx + bw * n, y + 1, bw * (v - n), 6, UI.bad);
}

export function inBox(g: Game, x: number, y: number, w: number, h: number): boolean {
  const m = g.screen.mouse;
  return m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
}

/** Left/right/up/down presses from any device, as -1, 0 or 1 on each axis. */
export function dirs(g: Game): { dx: number; dy: number } {
  const i = g.input;
  return {
    dx: (i.anyHit('right') >= 0 ? 1 : 0) - (i.anyHit('left') >= 0 ? 1 : 0),
    dy: (i.anyHit('down') >= 0 ? 1 : 0) - (i.anyHit('up') >= 0 ? 1 : 0),
  };
}

/** Draws a picture scaled to cover a box, cropping what does not fit. */
export function cover(s: Screen, img: HTMLCanvasElement, x: number, y: number, w: number, h: number): void {
  const k = Math.max(w / img.width, h / img.height);
  const sw = w / k;
  const sh = h / k;
  s.ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
