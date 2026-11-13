import type { TrackDef } from '../../content/types';

/** Open-desert courses three times the width of a stadium, with sand, washes and fast sweepers. */
export const TRACKS: TrackDef[] = [
  {
    id: 'baja-drylake', name: 'DRY LAKE 250', size: [1440, 810], theme: 'desert', laps: 2, half: 18,
    points: [[450, 90], [700, 140], [950, 90], [1220, 120], [1360, 220], [1340, 400], [1200, 470], [1000, 430], [880, 520], [1000, 620], [1220, 600], [1350, 660], [1300, 750], [1000, 750], [700, 720], [450, 760], [200, 720], [90, 600], [120, 440], [280, 400], [460, 430], [580, 340], [460, 250], [280, 270], [130, 230], [200, 120]],
    features: [
      { type: 'jump', at: 0.03 }, { type: 'sand', at: 0.09, len: 120 }, { type: 'whoops', at: 0.2, len: 110 }, { type: 'jump', at: 0.3, power: 1.3 },
      { type: 'water', at: 0.39, len: 50 }, { type: 'sand', at: 0.5, len: 140 }, { type: 'jump', at: 0.6 }, { type: 'whoops', at: 0.68, len: 120 },
      { type: 'mud', at: 0.78, len: 60 }, { type: 'jump', at: 0.88, power: 1.3 }, { type: 'sand', at: 0.94, len: 90 },
    ],
  },
  {
    id: 'baja-canyon', name: 'CANYON 1000', size: [1440, 810], theme: 'desert', laps: 2, half: 18,
    points: [[450, 120], [645, 255], [720, 405], [795, 555], [990, 690], [1260, 660], [1350, 450], [1275, 225], [1050, 120], [840, 225], [720, 405], [600, 585], [420, 705], [180, 660], [90, 420], [180, 180]],
    features: [
      { type: 'jump', at: 0.04, power: 1.2 }, { type: 'whoops', at: 0.2, len: 120 }, { type: 'sand', at: 0.3, len: 150 }, { type: 'jump', at: 0.42 },
      { type: 'water', at: 0.5, len: 50 }, { type: 'jump', at: 0.6, power: 1.3 }, { type: 'sand', at: 0.74, len: 150 }, { type: 'whoops', at: 0.86, len: 110 },
    ],
  },
  {
    id: 'baja-coast', name: 'COAST RUN', size: [1440, 810], theme: 'dusk', laps: 2, half: 18,
    points: [[720, 142], [1020, 120], [1260, 128], [1350, 218], [1260, 308], [900, 285], [600, 322], [345, 300], [262, 382], [345, 465], [600, 450], [900, 488], [1260, 465], [1350, 548], [1260, 638], [990, 668], [720, 660], [450, 675], [210, 645], [112, 555], [105, 375], [120, 195], [210, 128]],
    features: [
      { type: 'jump', at: 0.04 }, { type: 'sand', at: 0.12, len: 120 }, { type: 'whoops', at: 0.2, len: 120 }, { type: 'water', at: 0.3, len: 60 },
      { type: 'jump', at: 0.4, power: 1.3 }, { type: 'sand', at: 0.5, len: 140 }, { type: 'jump', at: 0.62 }, { type: 'whoops', at: 0.7, len: 120 },
      { type: 'mud', at: 0.8, len: 60 }, { type: 'jump', at: 0.93, power: 1.2 },
    ],
  },
];
