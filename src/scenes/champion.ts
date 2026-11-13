import { VIEW_W } from '../core/config';
import { TRUCK_COLORS } from '../content/trucks';
import type { Game, Scene } from '../game/game';
import { PLACE } from '../render/hud';
import { drawTruck } from '../render/truckSprites';

export function championScene(g: Game): Scene {
  const table = g.session.standings();
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
      s.rect(0, 0, VIEW_W, 270, '#14121c');
      s.text('CHAMPION', VIEW_W / 2, 14, '#ffb020', { align: 'center', size: 24 });
      const win = table[0];
      s.rect(190, 50, 100, 58, '#c89c5e');
      drawTruck(s.ctx, win.slot, 240, 86, t * 2, 0, 3);
      s.text(win.name, VIEW_W / 2, 116, TRUCK_COLORS[win.slot].css, { align: 'center', size: 16 });
      table.forEach((d, i) => {
        const y = 146 + i * 22;
        s.rect(110, y, 260, 18, '#22202e');
        s.rect(110, y, 4, 18, TRUCK_COLORS[d.slot].css);
        s.text(PLACE[i], 122, y + 5, i === 0 ? '#ffd84a' : '#fff');
        s.text(d.name, 166, y + 5, d.device !== null ? '#fff' : '#9a9aa8');
        s.text(`${d.points} PTS`, 360, y + 5, '#58c8ff', { align: 'right' });
      });
    },
  };
}
