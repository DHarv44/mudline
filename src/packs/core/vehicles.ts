import type { LayerRect, Token, VehicleDef } from '../../content/types';

/** Four wheel slices for a four-wheeled vehicle: front/rear x range, inner/outer y. */
export function wheels(x0: number, x1: number, y0: number, y1: number, t: Token): LayerRect[] {
  return [
    [-x1, -y1, -x0, -y0, t], [x0, -y1, x1, -y0, t],
    [-x1, y0, -x0, y1, t], [x0, y0, x1, y1, t],
  ];
}

export const VEHICLES: VehicleDef[] = [
  {
    id: 'stadium', name: 'STADIUM TRUCK', klass: 'truck', radius: 4.5,
    stats: { top: 92, accel: 78, grip: 5, turn: 3.5, mud: 0.5, land: 0.78, whoop: 0.955, jump: 1, air: 1.2, mass: 1, boost: 1.5, boostTime: 1.1 },
    layers: [
      wheels(2.5, 6.5, 3.2, 5.6, 'tyre'),
      wheels(2.5, 6.5, 3.2, 5.6, 'tyre'),
      [...wheels(2.5, 6.5, 3.2, 5.6, 'tread'), [-6.5, -3, 6.5, 3, 'chassis']],
      [[-7, -3.5, 7, 3.5, 'body', 0.55]],
      [[-7, -3.5, 7, 3.5, 'body', 0.78]],
      [[-7, -3.5, 7, 3.5, 'body'], [-6, -2.5, -1.5, 2.5, 'bed'], [3.5, -3, 7, 3, 'body', 1.18]],
      [[-1, -3, 3.5, 3, 'glass']],
      [[-1, -3, 3.5, 3, 'body', 1.25], [0.5, -2, 2.5, 2, 'body', 1.05]],
    ],
    side: {
      wheelbase: 34, wheelR: 8, wheelW: 5, exhaust: [-13, -9], bottle: [-5, -20],
      shapes: [
        ['chassis', 1, [-10, -7], [44, -7], [44, -4], [-10, -4]],
        ['body', 0.8, [-13, -16], [46, -16], [48, -8], [-13, -8]],
        ['body', 1, [-13, -20], [10, -20], [10, -16], [-13, -16]],
        ['body', 1, [10, -30], [24, -30], [30, -20], [30, -16], [10, -16]],
        ['glass', 1, [13, -28], [23, -28], [27, -20], [13, -20]],
        ['body', 1.12, [30, -20], [46, -18], [46, -16], [30, -16]],
        ['light', 1, [46, -15], [48, -15], [48, -12], [46, -12]],
      ],
    },
  },
  {
    id: 'prerunner', name: 'PRERUNNER', klass: 'truck', radius: 4.8,
    stats: { top: 98, accel: 70, grip: 4.6, turn: 3.2, mud: 0.56, land: 0.84, whoop: 0.965, jump: 1, air: 1, mass: 1.25, boost: 1.5, boostTime: 1.1 },
    layers: [
      wheels(3, 7.2, 3.3, 5.9, 'tyre'),
      wheels(3, 7.2, 3.3, 5.9, 'tyre'),
      [...wheels(3, 7.2, 3.3, 5.9, 'tread'), [-7, -3, 7, 3, 'chassis']],
      [[-7.6, -3.6, 7.6, 3.6, 'body', 0.55]],
      [[-7.6, -3.6, 7.6, 3.6, 'body', 0.78]],
      [[-7.6, -3.6, 7.6, 3.6, 'body'], [-6.8, -2.6, -2.5, 2.6, 'bed'], [-6.2, -1.5, -3.4, 1.5, 'tyre'], [3, -3.1, 7.6, 3.1, 'body', 1.18]],
      [[-2.5, -3.1, 3, 3.1, 'glass']],
      [[-2.5, -3.1, 3, 3.1, 'body', 1.25], [2, -2.6, 2.8, 2.6, 'light']],
    ],
    side: {
      wheelbase: 38, wheelR: 9, wheelW: 5.5, exhaust: [-14, -9], bottle: [-6, -21],
      shapes: [
        ['chassis', 1, [-11, -8], [49, -8], [49, -5], [-11, -5]],
        ['body', 0.8, [-14, -17], [50, -17], [52, -9], [-14, -9]],
        ['body', 1, [-14, -21], [6, -21], [6, -17], [-14, -17]],
        ['tyre', 1, [-11, -27], [-3, -27], [-3, -21], [-11, -21]],
        ['body', 1, [6, -32], [26, -32], [33, -21], [33, -17], [6, -17]],
        ['glass', 1, [9, -30], [25, -30], [30, -21], [9, -21]],
        ['body', 1.12, [33, -21], [50, -19], [50, -17], [33, -17]],
        ['light', 1, [22, -35], [27, -35], [27, -32], [22, -32]],
      ],
    },
  },
];
