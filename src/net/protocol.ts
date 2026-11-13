import type { Upgrades } from '../content/trucks';
import type { ResultRow } from '../game/session';
import type { Entry } from '../sim/race';

export type RoomState = 'lobby' | 'race' | 'results' | 'shop' | 'champion';
export type Mode = 'champ' | 'quick';

export interface DriverInfo {
  slot: number;
  /** Connection id of the player driving, or null for a computer driver (or a player who is away). */
  client: number | null;
  name: string;
  money: number;
  points: number;
  up: Upgrades;
  nitro: number;
  ready: boolean;
}

/** seats: the connection id in each truck slot, or null when the computer drives it. A player in no seat is watching. */
export interface RoomMsg { t: 'room'; code: string; you: number; host: number; state: RoomState; seats: (number | null)[] }
/** entries are the trucks exactly as the server built them at the start, so a late joiner's copy matches. */
export interface RaceMsg { t: 'race'; mode: Mode; round: number; trackId: string; laps: number; seed: number; entries: Entry[]; drivers: DriverInfo[] }
/**
 * k: one row per truck:
 * [slot, x, y, z, vz, vx, vy, heading, lap, pos, nitro, nitroT, cash, finished, place,
 *  steer, gas, brake, nitroHeld, idx, cp, passed, finishTime]
 * pk: pickups as [x, y, kind (0 nitro, 1 cash), secondsLeft]
 */
export interface SnapMsg { t: 'snap'; p: 'countdown' | 'racing' | 'done'; c: number; tm: number; k: number[][]; pk: number[][] }
export interface ResultsMsg { t: 'results'; rows: ResultRow[]; drivers: DriverInfo[] }
export interface ShopMsg { t: 'shop'; drivers: DriverInfo[] }
export interface ChampionMsg { t: 'champion'; drivers: DriverInfo[] }
export interface ErrorMsg { t: 'error'; msg: string }

export type ServerMsg = RoomMsg | RaceMsg | SnapMsg | ResultsMsg | ShopMsg | ChampionMsg | ErrorMsg;

/** pid identifies the browser, so a player who drops out can take their truck back. */
export type ClientMsg =
  | { t: 'create'; pid: string }
  | { t: 'join'; code: string; pid: string }
  | { t: 'start'; mode: Mode; track: number }
  /** [steer, gas, brake, nitro] */
  | { t: 'in'; s: number[] }
  | { t: 'buy'; item: string }
  | { t: 'ready'; v: boolean }
  | { t: 'next' }
  | { t: 'ping' };

export const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LEN = 4;
