import '@fontsource/press-start-2p';
import { Sfx } from './audio/sfx';
import { SIM_DT } from './core/config';
import { TRACKS } from './content/tracks';
import { statsFor } from './content/trucks';
import { Game, Scene, SceneName, TrackCache } from './game/game';
import { Session } from './game/session';
import { loadSettings } from './game/settings';
import { InputHub } from './input/devices';
import { FONT, Screen } from './render/screen';
import { championScene } from './scenes/champion';
import { controlsScene } from './scenes/controls';
import { lobbyScene } from './scenes/lobby';
import { NetClient } from './net/client';
import type { RaceMsg } from './net/protocol';
import { netLobbyScene } from './scenes/netLobby';
import { netRaceScene } from './scenes/netRace';
import { onlineScene } from './scenes/online';
import { optionsScene } from './scenes/options';
import { raceScene } from './scenes/race';
import { resultsScene } from './scenes/results';
import { shopScene } from './scenes/shop';
import { titleScene } from './scenes/title';
import { trackSelectScene } from './scenes/trackSelect';
import { aiControls } from './sim/ai';
import { Race } from './sim/race';
import { buildTrack } from './track/build';
import { validateTrack } from './track/validate';

const SCENES: Record<SceneName, (g: Game, arg: unknown) => Scene> = {
  title: (g) => titleScene(g),
  lobby: (g, arg) => lobbyScene(g, arg as 'champ' | 'quick'),
  tracks: (g) => trackSelectScene(g),
  race: (g) => raceScene(g),
  results: (g) => resultsScene(g),
  shop: (g) => shopScene(g),
  champion: (g) => championScene(g),
  options: (g) => optionsScene(g),
  controls: (g) => controlsScene(g),
  online: (g, arg) => onlineScene(g, arg as string | undefined),
  netLobby: (g) => netLobbyScene(g),
  netRace: (g, arg) => netRaceScene(g, arg as RaceMsg),
};

async function boot(): Promise<void> {
  await Promise.race([document.fonts.load(`8px ${FONT}`), new Promise((r) => setTimeout(r, 1500))]);

  const settings = loadSettings();
  const screen = new Screen();
  const input = new InputHub(settings.binds);
  const sfx = new Sfx();
  screen.crt = settings.crt;
  sfx.volume = settings.volume;
  sfx.engines = settings.engines;
  input.onGesture = () => sfx.unlock();
  window.addEventListener('mousedown', () => sfx.unlock());

  let scene: Scene;
  let sceneName: SceneName = 'title';
  const game: Game = {
    screen, input, sfx, settings,
    session: new Session(),
    tracks: new TrackCache(),
    net: new NetClient(() => game),
    go(name, arg) {
      scene?.leave?.();
      sceneName = name;
      scene = SCENES[name](game, arg);
    },
  };
  // An invite link carries the room code and opens straight on the join screen.
  const invite = new URLSearchParams(location.search).get('room');
  if (invite) game.go('online', invite);
  else game.go('title');

  const frame = (dt: number, draw: boolean) => {
    input.poll();
    scene.update(dt);
    screen.endInput();
    if (draw) {
      screen.begin();
      scene.draw();
      screen.end();
    }
  };

  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    // Queued first, so one bad frame cannot stop the game for good.
    requestAnimationFrame(loop);
    frame(dt, true);
  };
  requestAnimationFrame(loop);

  // Development hooks: layout checks and headless computer-only races.
  (window as unknown as Record<string, unknown>).__mud = {
    game,
    scene: () => sceneName,
    advance(sec: number, draw = true) {
      for (let t = 0; t < sec; t += 1 / 60) frame(1 / 60, false);
      if (draw) frame(0, true);
    },
    validate: () => TRACKS.map((d) => validateTrack(buildTrack(d))),
    sim(id: string, level = 0, maxSec = 400) {
      const track = game.tracks.get(id).track;
      const up = { tires: level, shocks: level, accel: level, speed: level };
      const entries = [0, 1, 2, 3].map((slot) => ({ slot, human: false, name: `C${slot}`, stats: statsFor(up, 0.95), nitro: 3 }));
      const race = new Race(track, entries, track.def.laps, 7);
      while (race.phase !== 'done' && race.time < maxSec) race.step(SIM_DT, (t) => aiControls(t, race, SIM_DT, t.finished ? 0.5 : 1));
      return { id, done: race.phase === 'done', times: race.trucks.map((t) => (t.finished ? +t.finishTime.toFixed(1) : `lap ${t.lap}`)) };
    },
  };
}

void boot();
