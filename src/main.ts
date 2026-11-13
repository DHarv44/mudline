import '@fontsource/press-start-2p';
import { Sfx } from './audio/sfx';
import { SIM_DT } from './core/config';
import { ALL_TRACKS } from './content/registry';
import { eventsScene } from './scenes/events';
import { garageScene } from './scenes/garage';
import { seasonScene } from './scenes/season';
import { Game, Scene, SceneName, TrackCache } from './game/game';
import { Session } from './game/session';
import { loadSettings } from './game/settings';
import { InputHub } from './input/devices';
import '@fontsource/rajdhani/700.css';
import { FONT, FONT_MODERN, Look, Screen } from './render/screen';
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
  events: (g, arg) => eventsScene(g, arg as string),
  lobby: (g, arg) => lobbyScene(g, arg as { series: string; mode: 'champ' | 'quick' }),
  garage: (g) => garageScene(g),
  season: (g, arg) => seasonScene(g, arg as string),
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

const LOOKS: Partial<Record<SceneName, Look>> = {
  title: 'retro', events: 'retro', lobby: 'retro', options: 'retro', controls: 'retro', online: 'retro',
  season: 'modern', garage: 'modern',
};

async function boot(): Promise<void> {
  await Promise.race([
    Promise.all([document.fonts.load(`8px ${FONT}`), document.fonts.load(`700 12px ${FONT_MODERN}`)]),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

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
      // Front-end and Classic screens keep the arcade look; everything in a modern series is drawn modern.
      screen.look = LOOKS[name] ?? game.session.style;
      scene = SCENES[name](game, arg);
    },
  };
  // An invite link carries the room code and opens straight on the join screen.
  const invite = new URLSearchParams(location.search).get('room');
  if (invite) game.go('online', invite);
  else game.go('title');

  const frame = (dt: number, draw: boolean) => {
    input.poll();
    // Browsers keep sound off until the player does something; a controller press counts as well as a key.
    if (input.padPressed()) sfx.unlock();
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
    validate: () => ALL_TRACKS.map((d) => validateTrack(buildTrack(d))),
    /** How a class's version of a track came out: bridges and what was built on it. */
    course(id: string, klass: string) {
      const t = game.tracks.track(id, klass);
      let jumps = 0;
      let whoops = 0;
      for (let i = 0; i < t.n; i++) {
        const prev = t.sampleSurf[(i + t.n - 1) % t.n];
        if (t.sampleSurf[i] === 3 && prev !== 3) jumps++;
        if (t.sampleSurf[i] === 4 && prev !== 4) whoops++;
      }
      return { id, klass, bridges: t.spans.length, jumps, whoops };
    },
    /** Runs one round of a series with computer drivers only and reports the finishing times. */
    /** `player` seats a stand-in for a human in slot 0: a computer driver with none of the rivals' advantages. */
    sim(seriesId: string, round = 0, klass = '', player = false, seed = 7, maxSec = 500) {
      const ses = new Session();
      ses.setup([player ? 0 : null, null, null, null], 'champ', seriesId, { klass });
      ses.round = round;
      const track = game.tracks.track(ses.trackId, ses.klass);
      const race = ses.tune(new Race(track, ses.entries(), track.def.laps, seed));
      while (race.phase !== 'done' && race.time < maxSec) race.step(SIM_DT, (t) => aiControls(t, race, SIM_DT, t.finished ? 0.5 : 1));
      return {
        track: track.def.id, done: race.phase === 'done', place: race.trucks.find((t) => t.slot === 0)?.place,
        times: race.trucks.map((t) => `${t.vehicle}:${t.finished ? t.finishTime.toFixed(0) : `lap${t.lap}`}`),
        // Where anyone who failed to finish ended up, to find spots that trap the computer drivers.
        lost: race.trucks.filter((t) => !t.finished).map((t) => [Math.round(t.x), Math.round(t.y), t.idx, track.n, t.cp, Math.round(Math.hypot(t.vx, t.vy))]),
      };
    },
  };
}

void boot();
