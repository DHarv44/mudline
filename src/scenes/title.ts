import { VIEW_H, VIEW_W } from '../core/config';
import { SIM_DT } from '../core/config';
import { TRACKS } from '../content/tracks';
import { CPU_NAMES, statsFor } from '../content/trucks';
import type { Game, Scene } from '../game/game';
import { RaceView } from '../render/raceView';
import { aiControls } from '../sim/ai';
import { Race } from '../sim/race';
import { ListMenu } from '../ui/menu';

/** Title screen over a computer-driven race, arcade attract-mode style. */
export function titleScene(g: Game): Scene {
  const menu = new ListMenu(['PLAY ONLINE', 'CHAMPIONSHIP', 'QUICK RACE', 'OPTIONS']);
  let race: Race;
  let view: RaceView;
  let acc = 0;
  let n = 0;

  const demo = () => {
    const compact = TRACKS.filter((t) => !t.long);
    const def = compact[n++ % compact.length];
    const built = g.tracks.get(def.id);
    const entries = CPU_NAMES.map((name, slot) => ({
      slot, human: false, name, nitro: 2,
      stats: statsFor({ tires: 2, shocks: 2, accel: 2, speed: 1 + (slot % 2) }, 0.95),
    }));
    race = new Race(built.track, entries, 3, Date.now() & 0xffff);
    race.count = 0.5;
    view = new RaceView(race, built.art);
  };
  demo();

  return {
    update(dt) {
      acc = Math.min(acc + dt, 0.1);
      while (acc >= SIM_DT) {
        race.step(SIM_DT, (t) => aiControls(t, race, SIM_DT, t.finished ? 0.5 : 1));
        acc -= SIM_DT;
      }
      race.events.length = 0;
      view.update(dt);
      if (race.phase === 'done') demo();

      const pick = menu.nav(g);
      if (pick === 0) g.go('online');
      else if (pick === 1) g.go('lobby', 'champ');
      else if (pick === 2) g.go('lobby', 'quick');
      else if (pick === 3) g.go('options');
    },
    draw() {
      const s = g.screen;
      view.draw(s);
      s.rect(0, 0, VIEW_W, VIEW_H, 'rgba(10,8,16,0.55)');
      const cx = VIEW_W / 2;
      s.text('MUDLINE', cx + 3, 51, '#7a1c10', { align: 'center', size: 40, shadow: '#1a0c08' });
      s.text('MUDLINE', cx, 48, '#ffb020', { align: 'center', size: 40, shadow: '#e04818' });
      s.rect(cx - 142, 94, 284, 3, '#ffd84a');
      s.rect(cx - 142, 99, 284, 1, '#e04818');
      menu.draw(g, cx, 140, 20, 'center');
    },
  };
}
