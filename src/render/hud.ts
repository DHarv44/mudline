import { VIEW_W } from '../core/config';
import { TRUCK_COLORS } from '../content/trucks';
import type { Race } from '../sim/race';
import type { Screen } from './screen';

export const PLACE = ['1ST', '2ND', '3RD', '4TH'];

export function drawHud(s: Screen, race: Race): void {
  const trucks = [...race.trucks].sort((a, b) => a.slot - b.slot);
  const w = 116;
  trucks.forEach((t, i) => {
    const x = 5 + i * (w + 2);
    s.rect(x, 3, w, 22, 'rgba(8,8,14,0.72)');
    s.rect(x, 3, 3, 22, TRUCK_COLORS[t.slot].css);
    s.text(t.name, x + 7, 6, t.human ? '#fff' : '#9a9aa8', { shadow: false });
    s.text(PLACE[t.pos], x + w - 4, 6, t.pos === 0 ? '#ffd84a' : '#fff', { align: 'right', shadow: false });
    const lap = t.finished ? 'DONE' : `L${Math.max(1, Math.min(t.lap, race.laps))}/${race.laps}`;
    s.text(lap, x + 7, 15, '#c8c8d4', { shadow: false });
    s.text(`N${t.nitro}`, x + w - 4, 15, '#58c8ff', { align: 'right', shadow: false });
  });

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
