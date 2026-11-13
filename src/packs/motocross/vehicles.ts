import type { LayerRect, VehicleDef } from '../../content/types';
import { wheels } from '../core/vehicles';

/** A seated rider, shared by anything you sit astride. */
const RIDER: LayerRect[][] = [
  [[2.3, -2.8, 3, 2.8, 'metal'], [-2.6, -1.7, 0.4, 1.7, 'rider']],
  [[-2.2, -1.6, 0.9, 1.6, 'body', 0.85], [0.6, -2.6, 2.5, -1.7, 'body', 0.85], [0.6, 1.7, 2.5, 2.6, 'body', 0.85]],
  [[-2, -1.5, 0.8, 1.5, 'body']],
  [[0, -1.2, 2.2, 1.2, 'helmet']],
  [[0.3, -0.9, 1.9, 0.9, 'helmet', 1.2]],
];

const BIKE_LAYERS: LayerRect[][] = [
  [[3, -0.9, 6.2, 0.9, 'tyre'], [-6.2, -0.9, -3, 0.9, 'tyre']],
  [[3, -0.9, 6.2, 0.9, 'tyre'], [-6.2, -0.9, -3, 0.9, 'tyre']],
  [[3, -0.9, 6.2, 0.9, 'tread'], [-6.2, -0.9, -3, 0.9, 'tread'], [-3, -0.6, 3, 0.6, 'chassis']],
  [[-3.2, -0.8, 3.2, 0.8, 'metal']],
  [[-0.5, -1.3, 2.6, 1.3, 'body'], [-3.6, -1, -0.5, 1, 'seat'], [-5.8, -0.9, -3.6, 0.9, 'body'], [3.4, -0.9, 5.6, 0.9, 'body', 1.15]],
  ...RIDER,
];

const BIKE_SIDE: VehicleDef['side'] = {
  wheelbase: 30, wheelR: 7.5, wheelW: 3, exhaust: [-4, -12], bottle: [8, -9],
  shapes: [
    ['metal', 0.8, [24, -21], [26.5, -21], [31, 0], [28.5, 0]],
    ['metal', 0.7, [0, -1], [14, -6], [14, -3], [0, 1]],
    ['metal', 1, [5, -5], [22, -5], [26, -14], [9, -14]],
    ['chassis', 1, [10, -11], [20, -11], [19, -5], [11, -5]],
    ['body', 1, [11, -19], [24, -19], [26, -13], [11, -13]],
    ['seat', 1, [-3, -17], [11, -18], [11, -14], [-1, -13]],
    ['body', 1.1, [-9, -14], [1, -16], [1, -13], [-7, -11]],
    ['body', 1.1, [24, -11], [37, -10], [37, -8], [26, -9]],
    ['body', 0.9, [26, -22], [30, -21], [30, -15], [27, -15]],
    ['metal', 1, [21, -24], [27, -24], [27, -22], [21, -22]],
  ],
};

export const VEHICLES: VehicleDef[] = [
  {
    id: 'mx250', name: 'SCRAMBLER 250', radius: 3.2,
    stats: { top: 88, accel: 96, grip: 4.4, turn: 4.3, mud: 0.42, land: 0.86, whoop: 0.97, jump: 1.25, air: 2.4, mass: 0.45, boost: 1.45, boostTime: 1 },
    layers: BIKE_LAYERS,
    side: BIKE_SIDE,
  },
  {
    id: 'mx450', name: 'THUMPER 450', radius: 3.2,
    stats: { top: 97, accel: 104, grip: 4, turn: 3.9, mud: 0.4, land: 0.84, whoop: 0.965, jump: 1.3, air: 2.2, mass: 0.5, boost: 1.45, boostTime: 1 },
    layers: BIKE_LAYERS,
    side: { ...BIKE_SIDE, wheelR: 8, exhaust: [-6, -13] },
  },
  {
    id: 'quad', name: 'QUAD 400', radius: 3.8,
    stats: { top: 86, accel: 88, grip: 5.4, turn: 3.8, mud: 0.5, land: 0.8, whoop: 0.96, jump: 1.1, air: 1.6, mass: 0.7, boost: 1.45, boostTime: 1 },
    layers: [
      wheels(1.8, 4.8, 2, 3.9, 'tyre'),
      wheels(1.8, 4.8, 2, 3.9, 'tyre'),
      [...wheels(1.8, 4.8, 2, 3.9, 'tread'), [-4, -1.8, 4, 1.8, 'chassis']],
      [[-4.4, -1.6, 4.4, 1.6, 'body', 0.7]],
      [[-4.9, -2.3, -1.6, 2.3, 'body'], [1.6, -2.3, 4.9, 2.3, 'body', 1.15], [-1.6, -1.2, 1.6, 1.2, 'seat']],
      ...RIDER,
    ],
    side: {
      wheelbase: 26, wheelR: 7, wheelW: 5, exhaust: [-8, -9], bottle: [6, -8],
      shapes: [
        ['chassis', 1, [-4, -7], [30, -7], [30, -3], [-4, -3]],
        ['metal', 1, [4, -12], [20, -12], [20, -7], [4, -7]],
        ['body', 1.1, [-11, -13], [6, -15], [6, -10], [-9, -9]],
        ['body', 1.1, [18, -15], [36, -13], [34, -9], [18, -10]],
        ['seat', 1, [-2, -18], [12, -18], [12, -15], [-2, -15]],
        ['body', 1, [10, -21], [22, -20], [22, -15], [10, -15]],
        ['metal', 1, [19, -26], [25, -26], [25, -24], [19, -24]],
        ['metal', 0.8, [21, -24], [23, -24], [24, -15], [22, -15]],
      ],
    },
  },
];
