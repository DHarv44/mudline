import { backdrop } from '../ui/kit';
import type { Game, Scene } from '../game/game';
import { saveSettings } from '../game/settings';
import { ListMenu } from '../ui/menu';

export function optionsScene(g: Game): Scene {
  const st = g.settings;
  const labels = () => [
    `SOUND  < ${st.volume} >`,
    `ENGINE SOUND  ${st.engines ? 'ON' : 'OFF'}`,
    `CRT FILTER  ${st.crt ? 'ON' : 'OFF'}`,
    'FULLSCREEN',
    'CONTROLS',
    'BACK',
  ];
  const menu = new ListMenu(labels());

  const apply = () => {
    g.sfx.volume = st.volume;
    g.sfx.engines = st.engines;
    g.screen.crt = st.crt;
    saveSettings(st);
    menu.items = labels();
  };

  return {
    update() {
      if (g.input.anyHit('back') >= 0) {
        g.sfx.play('back');
        g.go('title');
        return;
      }
      if (menu.sel === 0) {
        const d = (g.input.anyHit('right') >= 0 ? 1 : 0) - (g.input.anyHit('left') >= 0 ? 1 : 0);
        if (d) {
          st.volume = Math.max(0, Math.min(10, st.volume + d));
          apply();
          g.sfx.play('move');
        }
      }
      const pick = menu.nav(g);
      if (pick === 1) st.engines = !st.engines;
      else if (pick === 2) st.crt = !st.crt;
      else if (pick === 3) {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      } else if (pick === 4) g.go('controls');
      else if (pick === 5) g.go('title');
      if (pick === 1 || pick === 2) apply();
    },
    draw() {
      const s = g.screen;
      backdrop(s, 'OPTIONS');
      menu.draw(g, 150, 76, 22);
    },
  };
}
