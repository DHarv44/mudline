import type { RGB } from './themes';

export interface TruckColor { name: string; rgb: RGB; css: string }

export const TRUCK_COLORS: TruckColor[] = [
  { name: 'RED', rgb: [222, 48, 44], css: '#de302c' },
  { name: 'BLUE', rgb: [52, 104, 232], css: '#3468e8' },
  { name: 'YELLOW', rgb: [244, 204, 48], css: '#f4cc30' },
  { name: 'GREEN', rgb: [66, 196, 84], css: '#42c454' },
];

export const CPU_NAMES = ['TEX', 'ROXY', 'DIESEL', 'MOJO'];
export const POINTS = [5, 3, 2, 1];
export const CASH_PICKUP = 1000;
export const MAX_NITRO = 9;
