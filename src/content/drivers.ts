import type { RGB } from './themes';

export interface Paint { name: string; rgb: RGB; css: string }

/** Every paint a vehicle can wear. The first four are the arcade colours Classic gives each seat. */
export const PAINTS: Paint[] = [
  { name: 'RED', rgb: [222, 48, 44], css: '#de302c' },
  { name: 'BLUE', rgb: [52, 104, 232], css: '#3468e8' },
  { name: 'YELLOW', rgb: [244, 204, 48], css: '#f4cc30' },
  { name: 'GREEN', rgb: [66, 196, 84], css: '#42c454' },
  { name: 'ORANGE', rgb: [242, 124, 36], css: '#f27c24' },
  { name: 'PURPLE', rgb: [150, 80, 214], css: '#9650d6' },
  { name: 'TEAL', rgb: [40, 190, 184], css: '#28beb8' },
  { name: 'PINK', rgb: [240, 100, 170], css: '#f064aa' },
  { name: 'WHITE', rgb: [232, 232, 228], css: '#e8e8e4' },
  { name: 'BLACK', rgb: [70, 70, 80], css: '#464650' },
];

export const CPU_NAMES = ['TEX', 'ROXY', 'DIESEL', 'MOJO'];
export const POINTS = [5, 3, 2, 1];
export const CASH_PICKUP = 1000;
export const MAX_NITRO = 9;
