import { VIEW_W } from '../core/config';
import { TRACKS } from '../content/tracks';
import type { Game, Scene } from '../game/game';
import { ListMenu } from '../ui/menu';

export function trackSelectScene(g: Game): Scene {
  const menu = new ListMenu(TRACKS.map((t) => t.name));
  menu.sel = Math.max(0, g.session.order.indexOf(g.session.trackId));

  return {
    update() {
      if (g.input.anyHit('back') >= 0) {
        g.sfx.play('back');
        g.go('title');
        return;
      }
      const pick = menu.nav(g);
      if (pick >= 0) {
        g.session.round = pick;
        g.go('race');
      }
    },
    draw() {
      const s = g.screen;
      s.rect(0, 0, VIEW_W, 270, '#14121c');
      s.text('PICK A TRACK', VIEW_W / 2, 14, '#ffb020', { align: 'center', size: 16 });
      menu.draw(g, 26, 48, 17);
      const def = TRACKS[menu.sel];
      const built = g.tracks.get(def.id);
      s.rect(196, 60, 268, 153, '#ffd84a');
      s.ctx.drawImage(built.art, 198, 62, 264, 149);
      s.text(`${def.laps} LAPS`, 198, 222, '#d8d8e0');
      s.text(def.long ? 'LONG COURSE' : 'STADIUM', 462, 222, def.long ? '#ff8048' : '#58c8ff', { align: 'right' });
    },
  };
}
