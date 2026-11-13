import { PAINTS } from '../content/drivers';
import { trackById } from '../content/registry';
import type { Game } from '../game/game';
import type { Driver } from '../game/session';
import { PLACE } from '../render/hud';
import { drawVehicle } from '../render/sprites';
import { UI } from './kit';

/** The right-hand wall of the garage. Every view draws inside it. */
export const WALL = { x: 286, y: 40, w: 184, h: 220 };

export interface WallRow { label: string; sub?: string; right?: string; ink?: string; bad?: boolean }

export function rowHeight(count: number): number {
  return Math.min(28, WALL.h / count);
}

/** A list of rows with one highlighted; used for the main board and the parts wall. */
export function drawRows(g: Game, rows: WallRow[], sel: number): void {
  const s = g.screen;
  const h = rowHeight(rows.length);
  rows.forEach((r, i) => {
    const y = WALL.y + i * h;
    const on = sel === i;
    if (on) s.rect(WALL.x, y, WALL.w, h - 2, '#3a3650');
    const one = !r.sub;
    s.text(r.label, WALL.x + 5, y + (one ? h / 2 - 5 : 3), r.ink ?? (on ? UI.gold : UI.text));
    if (r.right) s.text(r.right, WALL.x + WALL.w - 4, y + 3, UI.cool, { align: 'right' });
    if (r.sub) s.text(r.sub, WALL.x + 5, y + 14, r.bad ? UI.bad : UI.dim, { shadow: false, size: 6 });
  });
}

export const PAINT_COLS = 5;
export const paintBox = (i: number) => ({
  x: WALL.x + 6 + (i % PAINT_COLS) * 35,
  y: WALL.y + 26 + Math.floor(i / PAINT_COLS) * 40,
  w: 30, h: 30,
});

export function drawPaint(g: Game, sel: number, current: number): void {
  const s = g.screen;
  s.text('PAINT', WALL.x + 5, WALL.y + 4, UI.dim, { shadow: false });
  s.text(PAINTS[sel].name, WALL.x + WALL.w - 4, WALL.y + 4, UI.gold, { align: 'right' });
  PAINTS.forEach((p, i) => {
    const b = paintBox(i);
    if (i === sel) s.rect(b.x - 3, b.y - 3, b.w + 6, b.h + 6, UI.gold);
    s.rect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, '#0c0b12');
    s.rect(b.x, b.y, b.w, b.h, p.css);
    s.rect(b.x, b.y, b.w, 6, 'rgba(255,255,255,0.25)');
    if (i === current) s.rect(b.x + 11, b.y + 11, 8, 8, '#0c0b12');
  });
}

/** The season calendar: what has been run and how it went, and what is next. */
export function drawSchedule(g: Game, slot: number, next: number): void {
  const s = g.screen;
  const ses = g.session;
  const h = Math.min(18, (WALL.h - 16) / ses.order.length);
  s.text('SCHEDULE', WALL.x + 5, WALL.y + 2, UI.dim, { shadow: false });
  ses.order.forEach((id, i) => {
    const y = WALL.y + 16 + i * h;
    const place = ses.history[i]?.[slot];
    const upNext = i === next;
    if (upNext) s.rect(WALL.x, y - 2, WALL.w, h - 1, '#3a3650');
    const ink = upNext ? UI.gold : place !== undefined ? UI.text : UI.faint;
    s.text(`${i + 1}`, WALL.x + 14, y, ink, { align: 'right', size: 6, shadow: false });
    s.text(trackById(id).name, WALL.x + 20, y, ink, { size: 6, shadow: false });
    const tag = place !== undefined ? PLACE[place] : upNext ? 'NEXT' : '';
    s.text(tag, WALL.x + WALL.w - 4, y, place === 0 ? UI.gold : upNext ? UI.good : UI.dim, { align: 'right', size: 6, shadow: false });
  });
}

export function drawStandings(g: Game, me: Driver): void {
  const s = g.screen;
  const ses = g.session;
  s.text('STANDINGS', WALL.x + 5, WALL.y + 2, UI.dim, { shadow: false });
  ses.standings().forEach((d, i) => {
    const y = WALL.y + 20 + i * 46;
    s.rect(WALL.x, y, WALL.w, 40, d === me ? '#3a3650' : '#1c1a28');
    s.rect(WALL.x, y, 3, 40, PAINTS[d.color].css);
    s.text(PLACE[i], WALL.x + 8, y + 6, i === 0 ? UI.gold : UI.text);
    s.ctx.imageSmoothingEnabled = ses.style === 'modern';
    drawVehicle(s.ctx, d.vehicle, d.color, ses.style, WALL.x + 22, y + 30, 0, 0, 1.1);
    s.ctx.imageSmoothingEnabled = false;
    s.text(d.name, WALL.x + 44, y + 6, d.device !== null ? '#fff' : UI.dim);
    s.text(`${d.points} PTS`, WALL.x + WALL.w - 4, y + 6, UI.cool, { align: 'right' });
    const wins = ses.history.filter((r) => r?.[d.slot] === 0).length;
    s.text(`${wins} ${wins === 1 ? 'WIN' : 'WINS'}`, WALL.x + 44, y + 24, UI.dim, { size: 6, shadow: false });
    s.text(`$${d.money}`, WALL.x + WALL.w - 4, y + 24, UI.gold, { align: 'right', size: 6, shadow: false });
  });
}
