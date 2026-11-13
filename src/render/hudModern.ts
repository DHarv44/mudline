import { VIEW_H, VIEW_W } from '../core/config';
import { PAINTS } from '../content/drivers';
import type { Race } from '../sim/race';
import type { Screen } from './screen';

const PLACE = ['1ST', '2ND', '3RD', '4TH'];

function clock(t: number): string {
  const m = Math.floor(t / 60);
  const sec = t - m * 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(1)}`;
}

/**
 * The modern race display: a running order, your position and lap, a clock, speed and nitro, and a map
 * of the course. Everything hugs the corners so the road stays clear.
 */
export function drawHudModern(s: Screen, race: Race): void {
  const c = s.ctx;
  const me = race.trucks.find((t) => t.human) ?? null;
  const glass = 'rgba(10,12,20,0.62)';

  // Running order.
  const order = [...race.trucks].sort((a, b) => a.pos - b.pos);
  s.box(8, 8, 92, 8 + order.length * 13, glass, 5);
  order.forEach((t, i) => {
    const y = 13 + i * 13;
    if (t === me) s.box(10, y - 2, 88, 12, 'rgba(255,216,74,0.16)', 3);
    s.text(`${i + 1}`, 15, y, t === me ? '#ffd84a' : '#9aa0b4', { shadow: false });
    s.box(26, y + 1, 4, 7, PAINTS[t.color].css, 1.5);
    s.text(t.name, 35, y, t === me ? '#fff' : '#c8ccd8', { shadow: false });
    if (t.finished) s.text('FIN', 94, y, '#58e070', { align: 'right', shadow: false, size: 6 });
  });

  // Position and lap, top right.
  if (me) {
    s.box(VIEW_W - 100, 8, 92, 44, glass, 5);
    s.text(PLACE[me.pos], VIEW_W - 54, 12, me.pos === 0 ? '#ffd84a' : '#fff', { align: 'center', size: 16 });
    const lap = me.finished ? 'FINISHED' : `LAP ${Math.max(1, Math.min(me.lap, race.laps))} / ${race.laps}`;
    s.text(lap, VIEW_W - 54, 32, '#c8ccd8', { align: 'center', shadow: false });
    s.text(clock(race.time), VIEW_W - 54, 43, '#7f8598', { align: 'center', shadow: false, size: 6 });

    // Speed and nitro, bottom left.
    const sp = Math.hypot(me.vx, me.vy);
    s.box(8, VIEW_H - 44, 104, 36, glass, 5);
    s.text(`${Math.round(sp * 1.1)}`, 50, VIEW_H - 40, '#fff', { align: 'right', size: 16 });
    s.text('KM/H', 54, VIEW_H - 32, '#7f8598', { shadow: false, size: 6 });
    const frac = Math.min(1, sp / (me.stats.top * me.stats.boost));
    s.box(14, VIEW_H - 20, 92, 3, 'rgba(255,255,255,0.12)', 1.5);
    s.box(14, VIEW_H - 20, 92 * frac, 3, me.nitroT > 0 ? '#58c8ff' : '#ffb020', 1.5);
    for (let i = 0; i < Math.min(9, me.nitro); i++) s.box(14 + i * 7, VIEW_H - 14, 5, 4, '#38b8ff', 1);
    if (me.nitro === 0) s.text('NO NITRO', 14, VIEW_H - 15, '#5a6074', { shadow: false, size: 6 });
  }

  // Course map, bottom right.
  const tr = race.track;
  const w = 86;
  const h = (w * tr.h) / tr.w;
  const x0 = VIEW_W - w - 12;
  const y0 = VIEW_H - h - 12;
  const k = w / tr.w;
  s.box(x0 - 4, y0 - 4, w + 8, h + 8, glass, 5);
  c.strokeStyle = 'rgba(236,238,246,0.9)';
  c.lineWidth = 1.5;
  c.lineJoin = 'round';
  c.beginPath();
  for (let i = 0; i <= tr.n; i += 5) {
    const j = i % tr.n;
    if (i === 0) c.moveTo(x0 + tr.sx[j] * k, y0 + tr.sy[j] * k);
    else c.lineTo(x0 + tr.sx[j] * k, y0 + tr.sy[j] * k);
  }
  c.closePath();
  c.stroke();
  for (const t of race.trucks) {
    c.fillStyle = PAINTS[t.color].css;
    c.beginPath();
    c.arc(x0 + t.x * k, y0 + t.y * k, t === me ? 2.4 : 1.7, 0, 6.3);
    c.fill();
    if (t === me) {
      c.strokeStyle = '#fff';
      c.lineWidth = 0.8;
      c.stroke();
    }
  }

  // Start lights.
  if (race.phase === 'countdown' || (race.phase === 'racing' && race.time < 0.9)) {
    const go = race.phase === 'racing';
    const cx = VIEW_W / 2;
    s.box(cx - 38, 30, 76, 28, 'rgba(10,12,20,0.8)', 8);
    for (let i = 0; i < 3; i++) {
      const on = go || i < race.lightsLit;
      c.fillStyle = on ? (go ? '#40e060' : '#f03c30') : '#2c2f3c';
      c.beginPath();
      c.arc(cx - 22 + i * 22, 44, 8, 0, 6.3);
      c.fill();
      if (on) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(cx - 22 + i * 22, 44, 2, cx - 22 + i * 22, 44, 20);
        g.addColorStop(0, go ? 'rgba(64,224,96,0.5)' : 'rgba(240,60,48,0.5)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(cx - 44 + i * 22, 22, 44, 44);
        c.restore();
      }
    }
  }
}
