import type { Sfx } from '../audio/sfx';
import { trackById } from '../content/registry';
import type { InputHub } from '../input/devices';
import type { NetClient } from '../net/client';
import { paintModern } from '../render/painterModern';
import { paintRetro } from '../render/painterRetro';
import type { Screen } from '../render/screen';
import type { Style } from '../render/sprites';
import { buildTrack, Track } from '../track/build';
import type { Session } from './session';
import type { Settings } from './settings';

export interface Scene {
  update(dt: number): void;
  draw(): void;
  leave?(): void;
}

export type SceneName =
  | 'title' | 'events' | 'season' | 'lobby' | 'tracks' | 'race' | 'results' | 'shop' | 'garage' | 'champion' | 'options' | 'controls'
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

/** A track ready to race: its geometry, its painted picture, and how many picture pixels make one world pixel. */
export interface BuiltTrack { track: Track; art: HTMLCanvasElement; k: number }

/** Tracks are built and painted on first use, then kept. */
export class TrackCache {
  private built = new Map<string, Track>();
  private art = new Map<string, BuiltTrack>();
  private thumbs = new Map<string, HTMLCanvasElement>();

  track(id: string): Track {
    let t = this.built.get(id);
    if (!t) {
      t = buildTrack(trackById(id));
      this.built.set(id, t);
    }
    return t;
  }

  get(id: string, style: Style): BuiltTrack {
    const key = `${id}/${style}`;
    let b = this.art.get(key);
    if (!b) {
      const track = this.track(id);
      const k = style === 'modern' ? Math.min(2, 2160 / track.w) : 1;
      b = { track, art: style === 'modern' ? paintModern(track, k) : paintRetro(track), k };
      this.art.set(key, b);
    }
    return b;
  }

  /** A small picture of the track for menus. */
  thumb(id: string, style: Style): HTMLCanvasElement {
    const key = `${id}/${style}`;
    let c = this.thumbs.get(key);
    if (!c) {
      const track = this.track(id);
      c = style === 'modern' ? paintModern(track, 400 / track.w) : this.get(id, 'retro').art;
      this.thumbs.set(key, c);
    }
    return c;
  }
}
