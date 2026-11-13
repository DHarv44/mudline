import type { TrackDef } from '../../content/types';

/** Tight, narrow courses built around jumps and rhythm sections. */
export const TRACKS: TrackDef[] = [
  {
    id: 'mx-holeshot', name: 'HOLESHOT', size: [720, 405], theme: 'loam', laps: 2, half: 13,
    points: [[360, 60], [600, 60], [660, 100], [600, 140], [440, 140], [380, 190], [440, 240], [600, 240], [660, 290], [600, 345], [360, 350], [120, 345], [60, 290], [120, 240], [230, 240], [285, 190], [230, 140], [120, 140], [60, 100], [120, 60]],
    features: [
      { type: 'jump', at: 0.05, power: 1.2 }, { type: 'whoops', at: 0.16, len: 70 }, { type: 'jump', at: 0.3 },
      { type: 'jump', at: 0.36 }, { type: 'mud', at: 0.47, len: 30 }, { type: 'jump', at: 0.55, power: 1.4 },
      { type: 'whoops', at: 0.64, len: 80 }, { type: 'jump', at: 0.8 }, { type: 'jump', at: 0.86 }, { type: 'jump', at: 0.95, power: 1.2 },
    ],
  },
  {
    id: 'mx-tabletop', name: 'TABLETOP', size: [720, 405], theme: 'clay', laps: 3, half: 13,
    points: [[180, 70], [280, 80], [360, 200], [440, 320], [540, 335], [650, 300], [670, 200], [650, 105], [540, 70], [440, 80], [360, 200], [280, 320], [180, 335], [70, 300], [50, 200], [70, 105]],
    features: [
      { type: 'jump', at: 0.04 }, { type: 'jump', at: 0.19, power: 1.5 }, { type: 'whoops', at: 0.28, len: 60 },
      { type: 'jump', at: 0.42 }, { type: 'mud', at: 0.5, len: 30 }, { type: 'jump', at: 0.69, power: 1.5 },
      { type: 'whoops', at: 0.78, len: 60 }, { type: 'jump', at: 0.92 },
    ],
  },
  {
    id: 'mx-rhythm', name: 'RHYTHM SECTION', size: [720, 405], theme: 'loam', laps: 2, half: 13,
    points: [[360, 50], [600, 80], [670, 200], [600, 330], [360, 360], [210, 335], [150, 250], [210, 150], [360, 130], [520, 160], [550, 205], [520, 265], [360, 280], [250, 275], [120, 310], [60, 260], [55, 180], [120, 80]],
    features: [
      { type: 'jump', at: 0.03 }, { type: 'jump', at: 0.08 }, { type: 'jump', at: 0.13 }, { type: 'whoops', at: 0.24, len: 90 },
      { type: 'jump', at: 0.36, power: 1.4 }, { type: 'water', at: 0.52, len: 26 }, { type: 'jump', at: 0.58 }, { type: 'jump', at: 0.63 },
      { type: 'whoops', at: 0.74, len: 60 }, { type: 'jump', at: 0.93, power: 1.3 },
    ],
  },
  {
    id: 'mx-arena', name: 'ARENA CROSS', theme: 'dusk', laps: 4, half: 12,
    points: [[240, 236], [90, 232], [48, 190], [60, 120], [48, 72], [100, 46], [180, 60], [240, 100], [300, 60], [380, 46], [432, 72], [420, 120], [432, 190], [390, 232]],
    features: [
      { type: 'jump', at: 0.06 }, { type: 'jump', at: 0.24 }, { type: 'whoops', at: 0.36, len: 44 }, { type: 'jump', at: 0.52 },
      { type: 'jump', at: 0.6 }, { type: 'mud', at: 0.74, len: 26 }, { type: 'jump', at: 0.93 },
    ],
  },
];
