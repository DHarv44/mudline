import { SIM_DT, VIEW_H, VIEW_W } from '../core/config';
import { trackById } from '../content/tracks';
import type { Game, Scene } from '../game/game';
import { Mirror } from '../net/mirror';
import type { RaceMsg } from '../net/protocol';
import { drawHud } from '../render/hud';
import { RaceView } from '../render/raceView';
import { aiControls } from '../sim/ai';
import { Race } from '../sim/race';
import { Controls, speedOf, Truck } from '../sim/truck';
import { ListMenu } from '../ui/menu';

/** Development aid: ?bot lets the computer drive this player's truck, for testing online races unattended. */
const BOT = new URLSearchParams(location.search).has('bot');

/** An online race: a local copy of the server's race, driven by this player's own controls. */
export function netRaceScene(g: Game, msg: RaceMsg): Scene {
  const net = g.net;
  const ses = g.session;
  const def = trackById(msg.trackId);
  const built = g.tracks.get(def.id);
  const mySlot = msg.drivers.find((d) => d.client === net.room?.you)?.slot ?? -1;
  // Only this player counts as "human" here, so the camera follows them on long tracks.
  const entries = msg.entries.map((e) => ({ ...e, human: e.slot === mySlot }));
  const race = new Race(built.track, entries, msg.laps, msg.seed);
  race.mirror = true;
  const mirror = new Mirror(race, mySlot);
  const view = new RaceView(race, built.art);
  const pause = new ListMenu(['RESUME', 'LEAVE ROOM']);
  const pad: Controls = { steer: 0, gas: 0, brake: 0, nitro: false };
  let menuOpen = false;
  let pane = 0;
  let acc = 0;
  let intro = 2.2;
  let sent = '';
  let sendT = 0;
  net.onSnap = (s) => mirror.apply(s);

  const control = (t: Truck): Controls => (t.slot === mySlot && !t.finished ? pad : mirror.controls[t.slot]);

  return {
    update(dt) {
      pane += ((menuOpen ? 1 : 0) - pane) * Math.min(1, dt * 14);
      if (g.input.anyHit('start') >= 0) {
        menuOpen = !menuOpen;
        pause.sel = 0;
      }
      const d = g.input.merged();
      const driving = !menuOpen && mySlot >= 0;
      pad.steer = driving ? d.steer : 0;
      pad.gas = driving && d.gas ? 1 : 0;
      pad.brake = driving && d.brake ? 1 : 0;
      pad.nitro = driving && d.nitro;
      const me0 = race.trucks.find((t) => t.slot === mySlot);
      if (BOT && me0) Object.assign(pad, aiControls(me0, race, dt));
      // Sent when the controls change, and a few times a second regardless in case one went missing.
      const out = [Math.round(pad.steer * 20) / 20, pad.gas, pad.brake, pad.nitro ? 1 : 0];
      const key = out.join();
      sendT -= dt;
      if (mySlot >= 0 && (key !== sent || sendT <= 0)) {
        sent = key;
        sendT = 0.2;
        net.send({ t: 'in', s: out });
      }

      if (menuOpen) {
        const pick = pause.nav(g);
        if (pick === 0) menuOpen = false;
        else if (pick === 1) {
          net.close();
          g.go('title');
          return;
        }
      }

      intro -= dt;
      acc = Math.min(acc + dt, 0.1);
      while (acc >= SIM_DT) {
        race.step(SIM_DT, control);
        acc -= SIM_DT;
      }
      for (const e of race.events) {
        if (e.type === 'count' || e.type === 'go' || e.type === 'finish' || e.slot === mySlot) g.sfx.play(e.type);
      }
      race.events.length = 0;
      const me = race.trucks.find((t) => t.slot === mySlot);
      if (me) g.sfx.setEngine(0, Math.min(1.4, speedOf(me) / 110));
      view.update(dt);
    },
    draw() {
      const s = g.screen;
      view.draw(s);
      drawHud(s, race);
      if (intro > 0 && race.phase === 'countdown') {
        s.text(def.name, VIEW_W / 2, 78, '#ffd84a', { align: 'center', size: 16 });
        if (msg.mode === 'champ') s.text(`ROUND ${msg.round + 1} OF ${ses.order.length}`, VIEW_W / 2, 100, '#fff', { align: 'center' });
      }
      if (race.trucks.find((t) => t.slot === mySlot)?.finished) {
        s.text('FINISH', VIEW_W / 2, 110, '#ffd84a', { align: 'center', size: 24 });
      }
      if (mySlot < 0) {
        s.rect(VIEW_W / 2 - 104, 248, 208, 16, 'rgba(8,8,14,0.72)');
        s.text('WATCHING - YOU RACE NEXT', VIEW_W / 2, 252, '#58c8ff', { align: 'center', shadow: false });
      }
      if (pane > 0.01) {
        const x = Math.round(-150 + 150 * pane);
        s.rect(x, 0, 150, VIEW_H, 'rgba(14,12,22,0.94)');
        s.rect(x + 150, 0, 2, VIEW_H, '#ffd84a');
        s.text(`ROOM ${net.room?.code ?? ''}`, x + 14, 40, '#ffb020');
        pause.draw(g, x + 28, 90, 20);
      }
    },
    leave() {
      net.onSnap = null;
      g.sfx.stopEngines();
    },
  };
}
