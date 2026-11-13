import type { Sfx } from '../audio/sfx';
import { trackById } from '../content/tracks';
import type { InputHub } from '../input/devices';
import type { NetClient } from '../net/client';
import type { Screen } from '../render/screen';
import { paintTrack } from '../render/trackPainter';
import { buildTrack, Track } from '../track/build';
import type { Session } from './session';
import type { Settings } from './settings';

export interface Scene {
  update(dt: number): void;
  draw(): void;
  leave?(): void;
}

export type SceneName =
  | 'title' | 'lobby' | 'tracks' | 'race' | 'results' | 'shop' | 'champion' | 'options' | 'controls'
  | 'online' | 'netLobby' | 'netRace';

export interface Game {
  screen: Screen;
  input: InputHub;
  sfx: Sfx;
  session: Session;
  settings: Settings;
  tracks: TrackCache;
  net: NetClient;
  go(name: SceneName, arg?: unknown): void;
}

export interface BuiltTrack { track: Track; art: HTMLCanvasElement }

/** Tracks are built and painted on first use, then kept. */
export class TrackCache {
  private map = new Map<string, BuiltTrack>();

  get(id: string): BuiltTrack {
    let b = this.map.get(id);
    if (!b) {
      const track = buildTrack(trackById(id));
      b = { track, art: paintTrack(track) };
      this.map.set(id, b);
    }
    return b;
  }
}
