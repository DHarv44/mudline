export const DIRT = 0;
export const MUD = 1;
export const WATER = 2;
export const JUMP = 3;
export const WHOOPS = 4;

export type FeatureType = 'mud' | 'water' | 'jump' | 'whoops';

export interface TrackDef {
  id: string;
  name: string;
  /** Long tracks use a 960x540 world with a moving camera. */
  long?: boolean;
  theme: string;
  laps: number;
  /** Half the track width in world pixels. */
  half: number;
  /** Closed loop of control points; the start line sits on the first one. */
  points: [number, number][];
  /** `at` is the fraction of a lap from the start line; `len` is in pixels. */
  features: { type: FeatureType; at: number; len?: number }[];
}

export const TRACKS: TrackDef[] = [
  {
    id: 'rookie', name: 'ROOKIE BOWL', theme: 'stadium', laps: 4, half: 15,
    points: [[240, 236], [70, 228], [45, 150], [70, 70], [160, 62], [240, 105], [320, 62], [410, 70], [435, 150], [410, 228]],
    features: [{ type: 'jump', at: 0.1 }, { type: 'mud', at: 0.3 }, { type: 'whoops', at: 0.88, len: 50 }],
  },
  {
    id: 'doubledip', name: 'DOUBLE DIP', theme: 'clay', laps: 4, half: 15,
    points: [[240, 238], [60, 225], [50, 140], [65, 62], [130, 55], [195, 70], [200, 120], [215, 165], [240, 172], [265, 165], [280, 120], [285, 70], [350, 55], [415, 62], [430, 140], [420, 225]],
    features: [{ type: 'jump', at: 0.08 }, { type: 'water', at: 0.2 }, { type: 'mud', at: 0.72 }, { type: 'jump', at: 0.9 }],
  },
  {
    id: 'crossfire', name: 'CROSSFIRE', theme: 'stadium', laps: 4, half: 15,
    points: [[120, 62], [180, 70], [240, 150], [300, 230], [360, 238], [420, 215], [438, 150], [420, 85], [360, 62], [300, 70], [240, 150], [180, 230], [120, 238], [60, 215], [42, 150], [60, 85]],
    features: [{ type: 'whoops', at: 0.27, len: 44 }, { type: 'mud', at: 0.44, len: 36 }, { type: 'water', at: 0.78 }],
  },
  {
    id: 'dustdevil', name: 'DUST DEVIL 500', long: true, theme: 'clay', laps: 2, half: 17,
    points: [[300, 70], [480, 120], [660, 70], [860, 100], [905, 200], [840, 290], [680, 270], [600, 350], [680, 430], [840, 400], [905, 450], [840, 500], [600, 500], [450, 440], [380, 330], [450, 230], [330, 190], [220, 260], [250, 380], [180, 470], [90, 440], [65, 300], [70, 180], [110, 100]],
    features: [
      { type: 'jump', at: 0.07 }, { type: 'whoops', at: 0.2 }, { type: 'mud', at: 0.33 }, { type: 'water', at: 0.47 },
      { type: 'jump', at: 0.56 }, { type: 'mud', at: 0.7 }, { type: 'whoops', at: 0.86 },
    ],
  },
  {
    id: 'rattler', name: 'RATTLER', theme: 'dusk', laps: 4, half: 15,
    points: [[240, 58], [400, 62], [432, 88], [400, 116], [240, 116], [140, 116], [108, 144], [140, 172], [240, 172], [400, 172], [432, 200], [400, 230], [240, 234], [80, 230], [48, 200], [46, 130], [48, 84], [72, 60]],
    features: [{ type: 'whoops', at: 0.24, len: 56 }, { type: 'jump', at: 0.46 }, { type: 'mud', at: 0.68 }, { type: 'water', at: 0.87, len: 26 }],
  },
  {
    id: 'horseshoe', name: 'HORSESHOE FLATS', theme: 'clay', laps: 4, half: 15,
    points: [[240, 242], [370, 236], [432, 190], [432, 110], [404, 70], [376, 110], [372, 150], [320, 182], [240, 188], [160, 182], [108, 150], [104, 110], [76, 70], [48, 110], [48, 190], [110, 236]],
    features: [{ type: 'jump', at: 0.17 }, { type: 'mud', at: 0.47 }, { type: 'whoops', at: 0.82, len: 50 }],
  },
  {
    id: 'canyon', name: 'CANYON CROSS', long: true, theme: 'stadium', laps: 3, half: 17,
    points: [[300, 80], [430, 170], [480, 270], [530, 370], [660, 460], [840, 440], [900, 300], [850, 150], [700, 80], [560, 150], [480, 270], [400, 390], [280, 470], [120, 440], [60, 280], [120, 120]],
    features: [
      { type: 'jump', at: 0.05 }, { type: 'mud', at: 0.24 }, { type: 'whoops', at: 0.36 }, { type: 'jump', at: 0.5 },
      { type: 'water', at: 0.72 }, { type: 'whoops', at: 0.86 },
    ],
  },
  {
    id: 'washboard', name: 'WASHBOARD', theme: 'stadium', laps: 4, half: 15,
    points: [[436, 150], [415, 225], [330, 236], [240, 215], [150, 236], [65, 225], [44, 150], [60, 70], [130, 60], [190, 95], [250, 60], [310, 95], [370, 60], [420, 75]],
    features: [{ type: 'whoops', at: 0.14, len: 70 }, { type: 'water', at: 0.42 }, { type: 'jump', at: 0.6 }, { type: 'whoops', at: 0.72, len: 60 }],
  },
  {
    id: 'anvil', name: 'THE ANVIL', theme: 'dusk', laps: 4, half: 15,
    points: [[240, 56], [420, 60], [436, 95], [410, 128], [330, 135], [300, 165], [310, 215], [280, 240], [200, 240], [170, 215], [180, 165], [150, 135], [70, 128], [44, 95], [60, 60]],
    features: [{ type: 'jump', at: 0.08 }, { type: 'mud', at: 0.34 }, { type: 'water', at: 0.5, len: 28 }, { type: 'whoops', at: 0.74, len: 44 }],
  },
  {
    id: 'spine', name: "SERPENT'S SPINE", long: true, theme: 'dusk', laps: 2, half: 17,
    points: [[480, 95], [680, 80], [840, 85], [900, 145], [840, 205], [600, 190], [400, 215], [230, 200], [175, 255], [230, 310], [400, 300], [600, 325], [840, 310], [900, 365], [840, 425], [660, 445], [480, 440], [300, 450], [140, 430], [75, 370], [70, 250], [80, 130], [140, 85]],
    features: [
      { type: 'jump', at: 0.05 }, { type: 'whoops', at: 0.19 }, { type: 'mud', at: 0.3 }, { type: 'jump', at: 0.42 },
      { type: 'water', at: 0.52 }, { type: 'whoops', at: 0.68 }, { type: 'mud', at: 0.78 }, { type: 'jump', at: 0.93 },
    ],
  },
  {
    id: 'chain', name: 'CHAIN GANG', theme: 'clay', laps: 4, half: 15,
    points: [[95, 78], [40, 150], [95, 222], [165, 150], [240, 84], [315, 150], [385, 222], [440, 150], [385, 78], [315, 150], [240, 216], [165, 150]],
    features: [{ type: 'mud', at: 0.12, len: 36 }, { type: 'jump', at: 0.33 }, { type: 'water', at: 0.55 }, { type: 'jump', at: 0.83 }],
  },
  {
    id: 'coil', name: 'THUNDER COIL', long: true, theme: 'stadium', laps: 2, half: 17,
    points: [[480, 60], [800, 110], [885, 270], [800, 430], [480, 485], [290, 450], [200, 330], [290, 190], [480, 165], [690, 200], [740, 270], [690, 345], [480, 375], [330, 370], [170, 420], [90, 360], [80, 250], [160, 110]],
    features: [
      { type: 'jump', at: 0.06 }, { type: 'whoops', at: 0.2 }, { type: 'mud', at: 0.31 }, { type: 'water', at: 0.52 },
      { type: 'jump', at: 0.62 }, { type: 'whoops', at: 0.73 }, { type: 'mud', at: 0.93 },
    ],
  },
];

export function trackById(id: string): TrackDef {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}
