import { VIEW_H, VIEW_W } from '../core/config';
import { PAINTS } from '../content/drivers';
import type { Race } from '../sim/race';
import { drawHudModern } from './hudModern';
import type { Screen } from './screen';

export const PLACE = ['1ST', '2ND', '3RD', '4TH'];

export function drawHud(s: Screen, race: Race): void {
  if (s.modern) {
    drawHudModern(s, race);
    return;
  }
  const trucks = [...race.trucks].sort((a, b) => a.slot - b.slot);
  const w = 116;
  trucks.forEach((t, i) => {
    const x = 5 + i * (w + 2);
    s.rect(x, 3, w, 22, 'rgba(8,8,14,0.72)');
    s.rect(x, 3, 3, 22, PAINTS[t.color].css);
    s.text(t.name, x + 7, 6, t.human ? '#fff' : '#9a9aa8', { shadow: false });
    s.text(PLACE[t.pos], x + w - 4, 6, t.pos === 0 ? '#ffd84a' : '#fff', { align: 'right', shadow: false });
    const lap = t.finished ? 'DONE' : `L${Math.max(1, Math.min(t.lap, race.laps))}/${race.laps}`;
    s.text(lap, x + 7, 15, '#c8c8d4', { shadow: false });
    s.text(`N${t.nitro}`, x + w - 4, 15, '#58c8ff', { align: 'right', shadow: false });
  });

  if (race.track.w > VIEW_W) drawMinimap(s, race);

  if (race.phase === 'countdown' || (race.phase === 'racing' && race.time < 0.9)) {
    const go = race.phase === 'racing';
    const lit = race.lightsLit;
    const cx = VIEW_W / 2;
    s.rect(cx - 34, 34, 68, 26, '#14141c');
    s.rect(cx - 32, 36, 64, 22, '#2a2a36');
    for (let i = 0; i < 3; i++) {
      const on = go || i < lit;
      s.rect(cx - 27 + i * 20, 40, 14, 14, on ? (go ? '#40e060' : '#f03c30') : '#48303a');
      if (on) s.rect(cx - 25 + i * 20, 42, 4, 4, go ? '#c8ffd0' : '#ffb0a0');
    }
  }
}

/** On tracks bigger than the screen, a small map of the whole course with everyone on it. */
function drawMinimap(s: Screen, race: Race): void {
  const tr = race.track;
  const w = 78;
  const h = (w * tr.h) / tr.w;
  const x0 = VIEW_W - w - 6;
  const y0 = VIEW_H - h - 6;
  const k = w / tr.w;
  const c = s.ctx;
  s.rect(x0 - 2, y0 - 2, w + 4, h + 4, 'rgba(8,8,14,0.6)');
  c.strokeStyle = 'rgba(232,220,200,0.85)';
  c.lineWidth = 1.6;
  c.beginPath();
  for (let i = 0; i <= tr.n; i += 6) {
    const j = i % tr.n;
    if (i === 0) c.moveTo(x0 + tr.sx[j] * k, y0 + tr.sy[j] * k);
    else c.lineTo(x0 + tr.sx[j] * k, y0 + tr.sy[j] * k);
  }
  c.closePath();
  c.stroke();
  for (const t of race.trucks) {
    s.rect(x0 + t.x * k - 1.5, y0 + t.y * k - 1.5, 3, 3, PAINTS[t.color].css);
  }
}
