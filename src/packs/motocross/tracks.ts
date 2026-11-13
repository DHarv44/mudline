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
    points: [[360, 350], [130, 345], [65, 290], [65, 120], [120, 62], [180, 110], [185, 230], [250, 285], [315, 230], [320, 110], [380, 62], [440, 110], [445, 230], [510, 285], [575, 230], [580, 110], [625, 62], [665, 120], [660, 290], [600, 345]],
    features: [
      { type: 'jump', at: 0.04 }, { type: 'jump', at: 0.13 }, { type: 'jump', at: 0.18, power: 1.3 }, { type: 'whoops', at: 0.27, len: 80 },
      { type: 'jump', at: 0.38 }, { type: 'jump', at: 0.43 }, { type: 'water', at: 0.51, len: 26 }, { type: 'jump', at: 0.58, power: 1.3 },
      { type: 'whoops', at: 0.67, len: 70 }, { type: 'jump', at: 0.8 }, { type: 'jump', at: 0.88 }, { type: 'jump', at: 0.95, power: 1.2 },
    ],
  },
  {
    // Too tight for anything with a cab.
    id: 'mx-arena', name: 'ARENA CROSS', theme: 'dusk', laps: 4, half: 12, classes: ['bike', 'quad'],
    points: [[240, 236], [90, 232], [48, 190], [60, 120], [48, 72], [100, 46], [180, 60], [240, 100], [300, 60], [380, 46], [432, 72], [420, 120], [432, 190], [390, 232]],
    features: [
      { type: 'jump', at: 0.06 }, { type: 'jump', at: 0.24 }, { type: 'whoops', at: 0.36, len: 44 }, { type: 'jump', at: 0.52 },
      { type: 'jump', at: 0.6 }, { type: 'mud', at: 0.74, len: 26 }, { type: 'jump', at: 0.93 },
    ],
  },
];
