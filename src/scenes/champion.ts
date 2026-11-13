import { VIEW_W } from '../core/config';
import { TRUCK_COLORS } from '../content/drivers';
import type { Game, Scene } from '../game/game';
import { PLACE } from '../render/hud';
import { drawVehicle } from '../render/sprites';
import { backdrop, panel, UI } from '../ui/kit';

export function championScene(g: Game): Scene {
  const ses = g.session;
  const table = ses.standings();
  let t = 0;
  g.sfx.play('finish');

  return {
    update(dt) {
      t += dt;
      if (t > 1 && (g.input.anyHit('ok') >= 0 || g.screen.mouse.click)) {
        if (g.net.online) {
          if (g.net.isHost) g.net.send({ t: 'next' });
          return;
        }
        g.sfx.play('ok');
        g.go('title');
      }
    },
    draw() {
      const s = g.screen;
      backdrop(s, 'CHAMPION', ses.series.name);
      const win = table[0];
      panel(s, 180, 42, 120, 66, true, TRUCK_COLORS[win.slot].css);
      s.rect(184, 46, 112, 58, '#b89058');
      s.ctx.imageSmoothingEnabled = ses.style === 'modern';
      drawVehicle(s.ctx, win.vehicle, win.slot, ses.style, 240, 82, t * 2, 0, 2.8);
      s.ctx.imageSmoothingEnabled = false;
      s.text(win.name, VIEW_W / 2, 116, TRUCK_COLORS[win.slot].css, { align: 'center', size: 16 });
      table.forEach((d, i) => {
        const y = 146 + i * 24;
        panel(s, 110, y, 260, 20, i === 0, TRUCK_COLORS[d.slot].css);
        s.rect(110, y, 4, 20, TRUCK_COLORS[d.slot].css);
        s.text(PLACE[i], 122, y + 6, i === 0 ? UI.gold : '#fff');
        s.text(d.name, 166, y + 6, d.device !== null ? '#fff' : UI.dim);
        s.text(`${d.points} PTS`, 360, y + 6, UI.cool, { align: 'right' });
      });
    },
  };
}
