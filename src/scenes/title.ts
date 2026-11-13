import { SIM_DT, VIEW_H, VIEW_W } from '../core/config';
import { classesOf, MODES, seriesOf, vehiclesIn } from '../content/registry';
import type { Game, Scene } from '../game/game';
import { Session } from '../game/session';
import { RaceView } from '../render/raceView';
import { aiControls } from '../sim/ai';
import { Race } from '../sim/race';
import { cover, dirs, inBox, panel, UI } from '../ui/kit';

const EXTRA = ['PLAY ONLINE', 'OPTIONS'];

/** Title screen: pick a mode from picture cards, over a computer-driven race. */
export function titleScene(g: Game): Scene {
  let race: Race;
  let view: RaceView;
  let acc = 0;
  let n = 0;
  let sel = 0;
  const top = MODES.length;
  const cardW = (440 - (top - 1) * 12) / top;
  const cardX = (i: number) => 20 + i * (cardW + 12);
  const btnX = (i: number) => 20 + i * 226;

  // The attract race cycles through every series the packs supply.
  const demo = () => {
    const all = MODES.flatMap((m) => seriesOf(m.id));
    const ses = new Session();
    const series = all[n % all.length];
    const classes = classesOf(series);
    ses.setup([null, null, null, null], 'quick', series.id, { klass: classes[n % Math.max(1, classes.length)] });
    ses.round = n++ % series.tracks.length;
    const built = g.tracks.get(ses.trackId, ses.style);
    race = new Race(built.track, ses.entries(), 2, Date.now() & 0xffff);
    race.count = 0.5;
    view = new RaceView(race, built, ses.style);
  };
  demo();

  const choose = (i: number) => {
    g.sfx.play('ok');
    if (i < top) {
      // A garage-based mode opens on the garage, or on choosing a championship when none is under way.
      if (MODES[i].shop !== 'garage') g.go('events', MODES[i].id);
      else if (g.session.load() && g.session.series.mode === MODES[i].id) g.go('garage');
      else g.go('season', MODES[i].id);
    }
    else if (i === top) g.go('online');
    else g.go('options');
  };

  return {
    update(dt) {
      acc = Math.min(acc + dt, 0.1);
      while (acc >= SIM_DT) {
        race.step(SIM_DT, (t) => aiControls(t, race, SIM_DT, t.finished ? 0.5 : 1));
        acc -= SIM_DT;
      }
      race.events.length = 0;
      view.update(dt);
      if (race.phase === 'done' || race.time > 45) demo();

      const { dx, dy } = dirs(g);
      const before = sel;
      if (sel < top) {
        sel = Math.max(0, Math.min(top - 1, sel + dx));
        if (dy > 0) sel = top + Math.min(EXTRA.length - 1, Math.round((sel / Math.max(1, top - 1)) * (EXTRA.length - 1)));
      } else {
        sel = Math.max(top, Math.min(top + EXTRA.length - 1, sel + dx));
        if (dy < 0) sel = Math.min(top - 1, sel - top);
      }
      const m = g.screen.mouse;
      if (m.moved || m.click) {
        for (let i = 0; i < top; i++) if (inBox(g, cardX(i), 86, cardW, 106)) sel = i;
        for (let i = 0; i < EXTRA.length; i++) if (inBox(g, btnX(i), 206, 214, 26)) sel = top + i;
        const over = sel < top ? inBox(g, cardX(sel), 86, cardW, 106) : inBox(g, btnX(sel - top), 206, 214, 26);
        if (m.click && over) {
          choose(sel);
          return;
        }
      }
      if (sel !== before) g.sfx.play('move');
      if (g.input.anyHit('ok') >= 0) choose(sel);
    },
    draw() {
      const s = g.screen;
      view.draw(s);
      s.rect(0, 0, VIEW_W, VIEW_H, 'rgba(10,8,16,0.62)');
      const cx = VIEW_W / 2;
      s.text('MUDLINE', cx + 3, 23, '#7a1c10', { align: 'center', size: 40, shadow: '#1a0c08' });
      s.text('MUDLINE', cx, 20, UI.amber, { align: 'center', size: 40, shadow: UI.fire });
      s.rect(cx - 142, 66, 284, 3, UI.gold);
      s.rect(cx - 142, 71, 284, 1, UI.fire);

      MODES.forEach((mode, i) => {
        const x = cardX(i);
        const on = sel === i;
        const all = seriesOf(mode.id);
        panel(s, x, 86, cardW, 106, on);
        s.ctx.imageSmoothingEnabled = mode.style === 'modern';
        cover(s, g.tracks.thumb(all[all.length - 1].tracks[0], mode.style), x + 4, 90, cardW - 8, 62);
        s.ctx.imageSmoothingEnabled = false;
        s.text(mode.name, x + cardW / 2, 158, on ? UI.gold : UI.text, { align: 'center', size: 16 });
        const tracks = new Set(all.flatMap((k) => k.tracks)).size;
        const rides = new Set(all.flatMap((k) => (classesOf(k).length ? classesOf(k).flatMap((c) => vehiclesIn(k, c)) : vehiclesIn(k)))).size;
        s.text(`${tracks} TRACKS  ${rides} ${rides === 1 ? 'VEHICLE' : 'VEHICLES'}`, x + cardW / 2, 179, UI.dim, { align: 'center', shadow: false });
      });
      EXTRA.forEach((label, i) => {
        const on = sel === top + i;
        panel(s, btnX(i), 206, 214, 26, on);
        s.text(label, btnX(i) + 107, 215, on ? UI.gold : UI.text, { align: 'center' });
      });
    },
  };
}
