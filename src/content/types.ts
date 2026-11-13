/**
 * The shapes of everything a content pack can supply. Packs hold the nouns (tracks, vehicles, parts, series);
 * the engine holds the verbs and never refers to a pack item by name.
 */

export const DIRT = 0;
export const MUD = 1;
export const WATER = 2;
export const JUMP = 3;
export const WHOOPS = 4;
export const SAND = 5;

export type FeatureType = 'mud' | 'water' | 'jump' | 'whoops' | 'sand';

export interface TrackDef {
  id: string;
  name: string;
  /** World size in pixels; anything larger than the 480x270 view gets a moving camera. */
  size?: [number, number];
  theme: string;
  laps: number;
  /** Half the track width in world pixels. */
  half: number;
  /** Closed loop of control points; the start line sits on the first one. */
  points: [number, number][];
  /**
   * `at` is the fraction of a lap from the start line; `len` is in pixels; `power` scales a jump.
   * Raced as written when there are no classes. In a class, the mud, water and sand stay where they are
   * and the jumps and whoops are rebuilt to suit that class.
   */
  features: Feature[];
  /** Classes this track is suitable for; every class when left out. */
  classes?: string[];
}

export interface Feature { type: FeatureType; at: number; len?: number; power?: number }

export interface Stats {
  top: number;
  accel: number;
  grip: number;
  turn: number;
  /** Speed kept through mud and sand (0..1). */
  mud: number;
  /** Speed kept on landing a jump (0..1). */
  land: number;
  /** Speed kept on each whoop (0..1). */
  whoop: number;
  /** How far it flies off a ramp. */
  jump: number;
  /** Turning rate in the air. */
  air: number;
  /** Weight in a collision. */
  mass: number;
  /** Top-speed multiplier while nitro burns. */
  boost: number;
  /** Seconds a nitro shot lasts. */
  boostTime: number;
}

export type Token = 'body' | 'tyre' | 'tread' | 'chassis' | 'glass' | 'bed' | 'metal' | 'rider' | 'helmet' | 'seat' | 'light';
/** x0, y0, x1, y1 in vehicle space (x forward), colour token, brightness. */
export type LayerRect = [number, number, number, number, Token, number?];
/** Colour token, brightness, then the polygon's points. Side view: x forward from the rear axle, y up is negative. */
export type SideShape = [Token, number, ...[number, number][]];

/**
 * How a class likes its course laid out. The builder reads a track's straights and fits jumps and whoops
 * to these numbers, so one layout rides differently for bikes than for trucks.
 */
export interface CourseProfile {
  /** Most jumps in a row on one straight. */
  rhythm: number;
  /** Pixels between jumps in a rhythm section. */
  gap: number;
  /** Launch strength of a rhythm jump, and of a lone big one. */
  power: number;
  big: number;
  /** Length of a ramp in pixels. */
  ramp: number;
  /** Share of straights given over to whoops (0..1). */
  whoops: number;
  /** Shortest straight worth building on, in pixels. */
  minRun: number;
}

/** A racing class. Vehicles only ever race others of their own class. */
export interface ClassDef {
  id: string;
  name: string;
  course: CourseProfile;
}

export interface VehicleDef {
  id: string;
  name: string;
  /** Class id. */
  klass: string;
  radius: number;
  stats: Stats;
  /** Top view as a stack of flat slices, bottom first. */
  layers: LayerRect[][];
  /** Side view for the garage. */
  side: {
    wheelbase: number;
    wheelR: number;
    wheelW: number;
    shapes: SideShape[];
    exhaust: [number, number];
    bottle: [number, number];
  };
}

/** How a part shows on the vehicle in the garage; the engine draws each kind. */
export type PartVisual = 'wheel' | 'ride' | 'exhaust' | 'bottle' | 'none';

export interface PartTier {
  name: string;
  price: number;
  /** Fractional change to each stat at this tier, e.g. accel 0.3 is +30%. */
  mods: Partial<Stats>;
}

export interface PartCategory {
  id: string;
  name: string;
  visual: PartVisual;
  /** Tier 0 is what the vehicle starts with. */
  tiers: PartTier[];
}

export interface Catalog {
  id: string;
  nitroPrice: number;
  categories: PartCategory[];
}

export interface ModeDef {
  id: string;
  name: string;
  style: 'retro' | 'modern';
  /** Which upgrade screen the mode uses between rounds. */
  shop: 'shop' | 'garage';
}

/** How hard the computer drivers race in a series. */
export interface Rivals {
  /** Top-speed factor in round one, how much it grows each round, and its ceiling. */
  skill: number;
  perRound: number;
  max: number;
  /** Extra pace per checkpoint a rival is behind the leading player (and less when ahead). 0 turns it off. */
  catchUp: number;
  /** How readily they fire nitro on a straight, in uses per second of opportunity. */
  nitro: number;
}

export interface SeriesDef {
  id: string;
  name: string;
  mode: string;
  /** The calendar, in order. Any track from any pack. */
  tracks: string[];
  /** A fixed list of vehicles everyone drives, for a series that is not run in classes. */
  vehicles?: string[];
  /** Classes the championship can be entered in; the field is then filled from that one class. */
  classes?: string[];
  catalog: string;
  startMoney: number;
  startNitro: number;
  prizes: number[];
  /** Left out, rivals start a little slow, improve each round and never chase. */
  rivals?: Rivals;
}

export interface Pack {
  modes?: ModeDef[];
  classes?: ClassDef[];
  series?: SeriesDef[];
  tracks?: TrackDef[];
  vehicles?: VehicleDef[];
  catalogs?: Catalog[];
}

/** Tier owned in each part category, by category id. */
export type Upgrades = Record<string, number>;
