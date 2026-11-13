import { trackById } from '../content/registry';
import type { Game, Scene } from '../game/game';
import { backdrop, panel, UI } from '../ui/kit';
import { ListMenu } from '../ui/menu';

/** Pick one track of the session's series for a single race. */
export function trackSelectScene(g: Game): Scene {
  const ses = g.session;
  const defs = ses.order.map(trackById);
  const menu = new ListMenu(defs.map((t) => t.name));
  menu.sel = Math.min(defs.length - 1, ses.round);

  return {
    update() {
      if (g.input.anyHit('back') >= 0) {
        g.sfx.play('back');
        g.go('events', ses.series.mode);
        return;
      }
      const pick = menu.nav(g);
      if (pick >= 0) {
        ses.round = pick;
        g.go('race');
      }
    },
    draw() {
      const s = g.screen;
      backdrop(s, 'PICK A TRACK', ses.series.name);
      menu.draw(g, 26, 52, 17);
      const def = defs[menu.sel];
      const art = g.tracks.thumb(def.id, ses.style);
      panel(s, 196, 60, 268, 154, true);
      s.ctx.imageSmoothingEnabled = ses.style === 'modern';
      s.ctx.drawImage(art, 198, 62, 264, 150);
      s.ctx.imageSmoothingEnabled = false;
      s.text(`${def.laps} LAPS`, 198, 224, UI.text);
      const big = (def.size?.[0] ?? 480) > 480;
      s.text(big ? 'OPEN COURSE' : 'STADIUM', 462, 224, big ? '#ff8048' : UI.cool, { align: 'right' });
    },
  };
}
