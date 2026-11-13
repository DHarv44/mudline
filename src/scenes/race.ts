import { SIM_DT, VIEW_H, VIEW_W } from '../core/config';
import { trackById } from '../content/registry';
import type { Game, Scene } from '../game/game';
import { drawHud } from '../render/hud';
import { RaceView } from '../render/raceView';
import { aiControls } from '../sim/ai';
import { Race } from '../sim/race';
import { Controls, speedOf, Truck } from '../sim/truck';
import { ListMenu } from '../ui/menu';

export function raceScene(g: Game): Scene {
  const ses = g.session;
  const def = trackById(ses.trackId);
  const built = g.tracks.get(def.id, ses.style, ses.klass);
  const race = new Race(built.track, ses.entries(), def.laps, (Date.now() & 0xffff) + ses.round);
  const view = new RaceView(race, built, ses.style);
  const pause = new ListMenu(['RESUME', 'RESTART', 'QUIT']);
  const pad: Controls = { steer: 0, gas: 0, brake: 0, nitro: false };
  const solo = ses.humans.length === 1;
  let paused = false;
  let pane = 0;
  let acc = 0;
  let intro = 2.2;

  const control = (t: Truck): Controls => {
    const dev = ses.drivers[t.slot].device;
    if (dev === null) return aiControls(t, race, SIM_DT);
    if (t.finished) return aiControls(t, race, SIM_DT, 0.5);
    // A lone player can drive with any keys or pad.
    const d = solo ? g.input.merged() : g.input.cur[dev];
    pad.steer = d.steer;
    pad.gas = d.gas ? 1 : 0;
    pad.brake = d.brake ? 1 : 0;
    pad.nitro = d.nitro;
    return pad;
  };

  return {
    update(dt) {
      pane += ((paused ? 1 : 0) - pane) * Math.min(1, dt * 14);
      if (g.input.anyHit('start') >= 0) {
        paused = !paused;
        pause.sel = 0;
        g.sfx.play(paused ? 'ok' : 'back');
      }
      if (paused) {
        g.sfx.stopEngines();
        const pick = pause.nav(g);
        if (pick === 0) paused = false;
        else if (pick === 1) g.go('race');
        else if (pick === 2) g.go(ses.mode === 'champ' && ses.shopScene === 'garage' ? 'garage' : 'title');
        return;
      }
      intro -= dt;
      acc = Math.min(acc + dt, 0.1);
      while (acc >= SIM_DT) {
        race.step(SIM_DT, control);
        acc -= SIM_DT;
      }
      for (const e of race.events) {
        const human = e.slot < 0 || ses.drivers[e.slot].device !== null;
        if (e.type === 'count' || e.type === 'go' || e.type === 'pickup' || e.type === 'finish') g.sfx.play(e.type);
        else if (human) g.sfx.play(e.type);
      }
      race.events.length = 0;
      ses.humans.forEach((d, i) => {
        const t = race.trucks.find((k) => k.slot === d.slot)!;
        g.sfx.setEngine(i, race.phase === 'done' ? -1 : Math.min(1.4, speedOf(t) / 110));
      });
      view.update(dt);
      if (race.phase === 'done') {
        ses.apply(race);
        g.go('results');
      }
    },
    draw() {
      const s = g.screen;
      view.draw(s);
      drawHud(s, race);
      if (intro > 0 && race.phase === 'countdown') {
        s.text(def.name, VIEW_W / 2, 78, '#ffd84a', { align: 'center', size: 16 });
        if (ses.mode === 'champ') s.text(`ROUND ${ses.round + 1} OF ${ses.order.length}`, VIEW_W / 2, 100, '#fff', { align: 'center' });
      }
      const humans = race.trucks.filter((t) => t.human);
      if (race.phase === 'racing' && humans.length && humans.every((t) => t.finished)) {
        s.text('FINISH', VIEW_W / 2, 110, '#ffd84a', { align: 'center', size: 24 });
      }
      if (pane > 0.01) {
        const x = Math.round(-150 + 150 * pane);
        s.rect(x, 0, 150, VIEW_H, 'rgba(14,12,22,0.94)');
        s.rect(x + 150, 0, 2, VIEW_H, '#ffd84a');
        s.text('PAUSED', x + 22, 40, '#ffb020', { size: 16 });
        pause.draw(g, x + 34, 90, 20);
      }
    },
    leave() {
      g.sfx.stopEngines();
    },
  };
}
