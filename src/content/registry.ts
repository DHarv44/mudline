import { bajaPack } from '../packs/baja';
import { corePack } from '../packs/core';
import { motocrossPack } from '../packs/motocross';
import { tourPack } from '../packs/tour';
import { circuitsPack } from '../packs/circuits';
import type { Catalog, ClassDef, CourseProfile, ModeDef, Pack, SeriesDef, Stats, TrackDef, Upgrades, VehicleDef } from './types';

/** Every pack the game ships with. Adding content means adding a pack (or a file to one) and listing it here. */
const PACKS: Pack[] = [corePack, motocrossPack, bajaPack, circuitsPack, tourPack];

function collect<T extends { id: string }>(pick: (p: Pack) => T[] | undefined): Map<string, T> {
  const m = new Map<string, T>();
  for (const p of PACKS) for (const item of pick(p) ?? []) m.set(item.id, item);
  return m;
}

const modes = collect((p) => p.modes);
const series = collect((p) => p.series);
const tracks = collect((p) => p.tracks);
const vehicles = collect((p) => p.vehicles);
const catalogs = collect((p) => p.catalogs);

function need<T>(m: Map<string, T>, id: string, what: string): T {
  const v = m.get(id) ?? m.values().next().value;
  if (!v) throw new Error(`No ${what} in any pack`);
  return v;
}

export const MODES: ModeDef[] = [...modes.values()];
export const ALL_TRACKS: TrackDef[] = [...tracks.values()];
export const ALL_SERIES: SeriesDef[] = [...series.values()];

export const modeById = (id: string): ModeDef => need(modes, id, 'mode');
export const seriesById = (id: string): SeriesDef => need(series, id, 'series');
export const trackById = (id: string): TrackDef => need(tracks, id, 'track');
export const vehicleById = (id: string): VehicleDef => need(vehicles, id, 'vehicle');
export const catalogById = (id: string): Catalog => need(catalogs, id, 'catalog');
export const seriesOf = (modeId: string): SeriesDef[] => ALL_SERIES.filter((s) => s.mode === modeId);
export const hasSeries = (id: string): boolean => series.has(id);

const classes = collect((p) => p.classes);
export const classById = (id: string): ClassDef => need(classes, id, 'class');

/** The classes a series can be entered in; empty for a series with a fixed vehicle list. */
export const classesOf = (s: SeriesDef): string[] => (s.vehicles ? [] : s.classes ?? []);

/** The vehicles that can line up in a series, for the chosen class where it has classes. */
export function vehiclesIn(s: SeriesDef, klass?: string): string[] {
  if (s.vehicles) return s.vehicles;
  const k = klass && classesOf(s).includes(klass) ? klass : classesOf(s)[0];
  return [...vehicles.values()].filter((v) => v.klass === k).map((v) => v.id);
}

/** A series' calendar for a class: its tracks, less any that do not suit that class. */
export function calendar(s: SeriesDef, klass?: string): string[] {
  if (!klass) return s.tracks;
  const fit = s.tracks.filter((id) => {
    const only = trackById(id).classes;
    return !only || only.includes(klass);
  });
  return fit.length ? fit : s.tracks;
}

/** How to build a track for a class: its own jumps and whoops, and bridges at the crossovers. Nothing for no class. */
export function buildFor(klass: string): { course?: CourseProfile; key?: string; bridges?: boolean } {
  return klass && classes.has(klass) ? { course: classById(klass).course, key: klass, bridges: true } : {};
}

const CAPPED: (keyof Stats)[] = ['mud', 'land', 'whoop'];

/** A vehicle's stats with its parts fitted. `skill` scales top speed for computer drivers. */
export function statsFor(v: VehicleDef, cat: Catalog, up: Upgrades, skill = 1): Stats {
  const out = { ...v.stats };
  for (const key of Object.keys(out) as (keyof Stats)[]) {
    let gain = 0;
    for (const c of cat.categories) gain += c.tiers[Math.min(up[c.id] ?? 0, c.tiers.length - 1)].mods[key] ?? 0;
    out[key] = v.stats[key] * (1 + gain);
    if (CAPPED.includes(key)) out[key] = Math.min(0.995, out[key]);
  }
  out.top *= skill;
  return out;
}

export function freshUpgrades(cat: Catalog, level = 0): Upgrades {
  const up: Upgrades = {};
  for (const c of cat.categories) up[c.id] = Math.min(level, c.tiers.length - 1);
  return up;
}
