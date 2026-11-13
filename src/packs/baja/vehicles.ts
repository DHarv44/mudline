import type { VehicleDef } from '../../content/types';
import { wheels } from '../core/vehicles';

const BASE: VehicleDef[] = [
  {
    id: 'trophy', name: 'TROPHY TRUCK', klass: 'truck', radius: 5.2,
    stats: { top: 112, accel: 74, grip: 4.6, turn: 2.9, mud: 0.6, land: 0.9, whoop: 0.98, jump: 1.05, air: 0.9, mass: 1.6, boost: 1.5, boostTime: 1.2 },
    layers: [
      wheels(3.2, 7.8, 3.5, 6.3, 'tyre'),
      wheels(3.2, 7.8, 3.5, 6.3, 'tyre'),
      wheels(3.2, 7.8, 3.5, 6.3, 'tyre'),
      [...wheels(3.2, 7.8, 3.5, 6.3, 'tread'), [-7.5, -3.2, 7.5, 3.2, 'chassis']],
      [[-8.4, -3.8, 8.4, 3.8, 'body', 0.55]],
      [[-8.4, -3.8, 8.4, 3.8, 'body', 0.78]],
      [[-8.4, -3.8, 8.4, 3.8, 'body'], [-7.6, -2.8, -2, 2.8, 'bed'], [-7.2, -1.6, -4.2, 1.6, 'tyre'], [-3.8, -1.6, -2.4, 1.6, 'metal'], [3.6, -3.2, 8.4, 3.2, 'body', 1.18]],
      [[-2, -3.2, 3.6, 3.2, 'glass']],
      [[-2, -3.2, 3.6, 3.2, 'body', 1.25], [2.6, -2.8, 3.4, 2.8, 'light']],
    ],
    side: {
      wheelbase: 42, wheelR: 10.5, wheelW: 6, exhaust: [-15, -10], bottle: [-2, -23],
      shapes: [
        ['chassis', 1, [-12, -9], [54, -9], [54, -5], [-12, -5]],
        ['body', 0.8, [-16, -19], [56, -19], [58, -10], [-16, -10]],
        ['body', 1, [-16, -23], [8, -24], [8, -19], [-16, -19]],
        ['tyre', 1, [-13, -32], [-3, -32], [-3, -23], [-13, -23]],
        ['body', 1, [8, -35], [30, -35], [38, -24], [38, -19], [8, -19]],
        ['glass', 1, [11, -33], [29, -33], [35, -24], [11, -24]],
        ['body', 1.12, [38, -24], [56, -21], [56, -19], [38, -19]],
        ['light', 1, [24, -39], [32, -39], [32, -35], [24, -35]],
        ['light', 1, [56, -17], [58, -17], [58, -13], [56, -13]],
      ],
    },
  },
  {
    id: 'dunebug', name: 'DUNE BUGGY', klass: 'buggy', radius: 4.4,
    stats: { top: 104, accel: 86, grip: 4.9, turn: 3.4, mud: 0.5, land: 0.86, whoop: 0.97, jump: 1.15, air: 1.4, mass: 0.9, boost: 1.5, boostTime: 1.1 },
    layers: [
      wheels(2.8, 6.6, 2.9, 5.2, 'tyre'),
      wheels(2.8, 6.6, 2.9, 5.2, 'tyre'),
      [...wheels(2.8, 6.6, 2.9, 5.2, 'tread'), [-6, -2.2, 6.4, 2.2, 'chassis']],
      [[-6.4, -2.6, 3, 2.6, 'body', 0.7], [3, -2, 7.2, 2, 'body', 0.7]],
      [[-3, -2.6, 3, 2.6, 'body'], [3, -2, 7.2, 2, 'body', 1.15], [-6.6, -1.8, -3, 1.8, 'metal', 0.8], [-1.5, -1.6, 1.5, 1.6, 'seat']],
      [[-0.6, -1, 1.2, 1, 'helmet']],
      [[-2.6, -2.8, -2, 2.8, 'metal'], [2.2, -2.8, 2.8, 2.8, 'metal'], [-2.6, -2.8, 2.8, -2.2, 'metal'], [-2.6, 2.2, 2.8, 2.8, 'metal']],
    ],
    side: {
      wheelbase: 36, wheelR: 9, wheelW: 5, exhaust: [-12, -12], bottle: [4, -10],
      shapes: [
        ['chassis', 1, [-8, -8], [44, -8], [44, -4], [-8, -4]],
        ['metal', 0.8, [-13, -17], [2, -17], [2, -8], [-11, -8]],
        ['body', 1, [2, -17], [26, -17], [46, -11], [46, -8], [2, -8]],
        ['seat', 1, [8, -22], [14, -22], [15, -17], [7, -17]],
        ['metal', 1, [0, -31], [22, -31], [22, -29], [0, -29]],
        ['metal', 1, [0, -31], [2, -31], [2, -17], [0, -17]],
        ['metal', 1, [20, -31], [22, -31], [30, -17], [28, -17]],
        ['light', 1, [16, -35], [22, -35], [22, -31], [16, -31]],
      ],
    },
  },
];

export const VEHICLES: VehicleDef[] = [
  ...BASE,
  // A stripped rail: the buggy with the weight taken out, quicker and livelier but harsher over the rough.
  {
    ...BASE[1], id: 'sandrail', name: 'SAND RAIL',
    stats: { ...BASE[1].stats, top: 100, accel: 96, grip: 4.5, turn: 3.7, land: 0.82, mass: 0.75, air: 1.7, jump: 1.2 },
    side: { ...BASE[1].side, wheelR: 8 },
  },
];
