import type { RGB } from './themes';

export interface TruckColor { name: string; rgb: RGB; css: string }

export const TRUCK_COLORS: TruckColor[] = [
  { name: 'RED', rgb: [222, 48, 44], css: '#de302c' },
  { name: 'BLUE', rgb: [52, 104, 232], css: '#3468e8' },
  { name: 'YELLOW', rgb: [244, 204, 48], css: '#f4cc30' },
  { name: 'GREEN', rgb: [66, 196, 84], css: '#42c454' },
];

export const CPU_NAMES = ['TEX', 'ROXY', 'DIESEL', 'MOJO'];

export type UpgradeId = 'tires' | 'shocks' | 'accel' | 'speed';
export type Upgrades = Record<UpgradeId, number>;

export const UPGRADES: { id: UpgradeId; name: string }[] = [
  { id: 'tires', name: 'TIRES' },
  { id: 'shocks', name: 'SHOCKS' },
  { id: 'accel', name: 'ENGINE' },
  { id: 'speed', name: 'TOP SPEED' },
];

export const MAX_LEVEL = 5;
export const NITRO_PRICE = 1500;
export const START_MONEY = 5000;
export const START_NITRO = 3;
export const PRIZES = [10000, 7000, 4000, 2000];
export const POINTS = [5, 3, 2, 1];
export const CASH_PICKUP = 1000;

export function upgradePrice(level: number): number {
  return 4000 + 3000 * level;
}

export interface Stats {
  top: number;
  accel: number;
  grip: number;
  turn: number;
  /** Speed kept through mud (0..1). */
  mud: number;
  /** Speed kept on landing a jump. */
  land: number;
  /** Speed kept on each whoop. */
  whoop: number;
}

export function statsFor(up: Upgrades, skill = 1): Stats {
  return {
    top: (92 + 10 * up.speed) * skill,
    accel: 78 + 15 * up.accel,
    grip: 5 + 1.0 * up.tires,
    turn: 3.5 + 0.08 * up.tires,
    mud: 0.5 + 0.06 * up.tires,
    land: 0.78 + 0.04 * up.shocks,
    whoop: 0.955 + 0.008 * up.shocks,
  };
}
