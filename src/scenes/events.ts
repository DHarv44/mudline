import { modeById, seriesOf, vehiclesIn } from '../content/registry';
import type { Game, Scene } from '../game/game';
import { drawVehicle } from '../render/sprites';
import { backdrop, cover, dirs, inBox, panel, UI } from '../ui/kit';

const KINDS: { id: 'champ' | 'quick'; label: string }[] = [
  { id: 'champ', label: 'CHAMPIONSHIP' },
  { id: 'quick', label: 'SINGLE RACE' },
];

/** Choose a series in the mode, and whether to run all of it or one race. */
export function eventsScene(g: Game, modeId: string): Scene {
  const mode = modeById(modeId);
  const all = seriesOf(mode.id);
  let sel = 0;
  let kind = 0;
  let spin = 0;
  const w = Math.min(220, (448 - (all.length - 1) * 8) / all.length);
  const x0 = (480 - (all.length * w + (all.length - 1) * 8)) / 2;
  const cardX = (i: number) => x0 + i * (w + 8);
  const btnX = (i: number) => 20 + i * 226;

  const start = () => {
    g.sfx.play('ok');
    g.go('lobby', { series: all[sel].id, mode: KINDS[kind].id });
  };

  return {
    update(dt) {
      spin += dt;
      if (g.input.anyHit('back') >= 0) {
        g.sfx.play('back');
        g.go('title');
        return;
      }
      const { dx, dy } = dirs(g);
      const before = sel * 10 + kind;
      sel = (sel + dx + all.length) % all.length;
      kind = (kind + dy + KINDS.length) % KINDS.length;
      const m = g.screen.mouse;
      if (m.moved || m.click) {
        for (let i = 0; i < all.length; i++) if (inBox(g, cardX(i), 42, w, 156)) sel = i;
        for (let i = 0; i < KINDS.length; i++) {
          if (!inBox(g, btnX(i), 208, 214, 26)) continue;
          kind = i;
          if (m.click) {
            start();
            return;
          }
        }
      }
      if (sel * 10 + kind !== before) g.sfx.play('move');
      if (g.input.anyHit('ok') >= 0) start();
    },
    draw() {
      const s = g.screen;
      backdrop(s, mode.name);
      all.forEach((series, i) => {
        const x = cardX(i);
        const on = sel === i;
        panel(s, x, 42, w, 156, on);
        s.ctx.imageSmoothingEnabled = mode.style === 'modern';
        cover(s, g.tracks.thumb(series.tracks[0], mode.style), x + 4, 46, w - 8, 74);
        const rides = vehiclesIn(series);
        const gap = (w - 16) / rides.length;
        rides.forEach((v, k) => {
          drawVehicle(s.ctx, v, k % 4, mode.style, x + 8 + gap * (k + 0.5), 172, on ? spin * 1.5 + k : -Math.PI / 2, 0, 1.3);
        });
        s.ctx.imageSmoothingEnabled = false;
        s.text(series.name, x + w / 2, 126, on ? UI.gold : UI.text, { align: 'center', size: w < 150 ? 8 : 16 });
        s.text(`${series.tracks.length} ROUNDS`, x + w / 2, 146, UI.dim, { align: 'center', shadow: false });
      });
      KINDS.forEach((k, i) => {
        const on = kind === i;
        panel(s, btnX(i), 208, 214, 26, on);
        s.text(k.label, btnX(i) + 107, 217, on ? UI.gold : UI.text, { align: 'center' });
      });
    },
  };
}
