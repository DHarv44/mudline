export type RGB = [number, number, number];

export interface Theme {
  /** light, base, dark */
  dirt: [RGB, RGB, RGB];
  ground: [RGB, RGB, RGB];
  barrierA: RGB;
  barrierB: RGB;
  mud: [RGB, RGB];
  water: [RGB, RGB, RGB];
  /** Raced under lights: the modern renderer dims the ground and switches headlights on. */
  night?: boolean;
}

export const THEMES: Record<string, Theme> = {
  stadium: {
    dirt: [[222, 176, 112], [204, 156, 94], [176, 130, 76]],
    ground: [[110, 78, 48], [96, 66, 40], [80, 54, 32]],
    barrierA: [228, 228, 220],
    barrierB: [208, 48, 44],
    mud: [[92, 58, 34], [70, 42, 24]],
    water: [[70, 150, 226], [44, 112, 200], [150, 210, 248]],
  },
  clay: {
    dirt: [[226, 138, 86], [206, 114, 66], [176, 90, 52]],
    ground: [[86, 104, 52], [72, 90, 44], [58, 74, 36]],
    barrierA: [240, 220, 120],
    barrierB: [40, 40, 48],
    mud: [[104, 52, 34], [78, 36, 24]],
    water: [[70, 160, 210], [40, 120, 184], [160, 220, 240]],
  },
  loam: {
    dirt: [[150, 108, 70], [126, 88, 56], [100, 68, 42]],
    ground: [[86, 128, 60], [70, 110, 50], [56, 92, 42]],
    barrierA: [236, 236, 228],
    barrierB: [50, 120, 210],
    mud: [[70, 44, 28], [52, 32, 20]],
    water: [[70, 150, 226], [44, 112, 200], [150, 210, 248]],
  },
  desert: {
    dirt: [[214, 170, 118], [192, 146, 98], [164, 120, 80]],
    ground: [[232, 206, 150], [218, 190, 134], [198, 168, 116]],
    barrierA: [250, 250, 240],
    barrierB: [230, 110, 40],
    mud: [[112, 74, 46], [86, 54, 34]],
    water: [[70, 170, 200], [40, 130, 170], [170, 230, 240]],
  },
  dusk: {
    night: true,
    dirt: [[188, 150, 150], [164, 124, 128], [136, 98, 108]],
    ground: [[52, 62, 92], [42, 50, 78], [32, 38, 62]],
    barrierA: [250, 180, 60],
    barrierB: [70, 60, 110],
    mud: [[80, 56, 66], [58, 38, 48]],
    water: [[80, 130, 230], [50, 90, 200], [170, 200, 255]],
  },
};

export const CROWD: RGB[] = [
  [220, 60, 60], [60, 110, 220], [240, 210, 70], [240, 240, 240],
  [70, 190, 90], [40, 40, 50], [230, 150, 110], [150, 80, 180],
];
