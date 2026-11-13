import type { Pack } from '../../content/types';

const ALL = ['bike', 'quad', 'truck', 'buggy'];
// Rivals here start level with the player, sharpen each round, chase when behind and use their nitro.
const RIVALS = { skill: 0.96, perRound: 0.006, max: 1.05, catchUp: 0.02, nitro: 1 };
const MONEY = { catalog: 'workshop', startMoney: 6000, startNitro: 3, classes: ALL, rivals: RIVALS };

/**
 * The Unlimited championships. Each is a calendar drawn from every pack's tracks and can be entered in any
 * class; the whole field then races that class, on courses rebuilt to suit it. A track marked for particular
 * classes simply drops off the calendar for the others.
 */
export const tourPack: Pack = {
  series: [
    {
      id: 'arena', name: 'ARENA SERIES', mode: 'unlimited', ...MONEY, prizes: [12000, 8000, 5000, 3000],
      tracks: ['rookie', 'mx-arena', 'doubledip', 'crossfire', 'rattler', 'horseshoe', 'washboard', 'anvil', 'chain'],
    },
    {
      id: 'outdoor', name: 'OUTDOOR NATIONALS', mode: 'unlimited', ...MONEY, prizes: [12000, 8000, 5000, 3000],
      tracks: ['mx-holeshot', 'cc-pretzel', 'mx-tabletop', 'canyon', 'mx-rhythm', 'cc-switchyard', 'mx-arena', 'coil'],
    },
    {
      id: 'desert', name: 'DESERT 1000', mode: 'unlimited', ...MONEY, startNitro: 4, prizes: [14000, 9000, 6000, 3000],
      tracks: ['dustdevil', 'baja-drylake', 'cc-spiral', 'baja-canyon', 'spine', 'baja-coast', 'canyon'],
    },
    {
      id: 'grand', name: 'GRAND TOUR', mode: 'unlimited', ...MONEY, prizes: [15000, 10000, 6000, 3000],
      tracks: ['rookie', 'mx-holeshot', 'cc-pretzel', 'baja-drylake', 'crossfire', 'cc-spiral', 'mx-tabletop', 'chain', 'cc-switchyard', 'mx-rhythm', 'baja-coast', 'coil'],
    },
  ],
};
