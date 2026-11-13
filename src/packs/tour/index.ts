import type { Pack } from '../../content/types';

const ALL = ['bike', 'quad', 'truck', 'buggy'];
const MONEY = { catalog: 'workshop', startMoney: 6000, startNitro: 3 };

/**
 * The Unlimited championships. Each is a calendar drawn from every pack's tracks, entered in one class;
 * the whole field then races that class.
 */
export const tourPack: Pack = {
  series: [
    {
      id: 'arena', name: 'ARENA SERIES', mode: 'unlimited', classes: ALL, ...MONEY, prizes: [12000, 8000, 5000, 3000],
      tracks: ['rookie', 'mx-arena', 'doubledip', 'crossfire', 'rattler', 'horseshoe', 'washboard', 'anvil', 'chain'],
    },
    {
      id: 'outdoor', name: 'OUTDOOR NATIONALS', mode: 'unlimited', classes: ['bike', 'quad'], ...MONEY, prizes: [12000, 8000, 5000, 3000],
      tracks: ['mx-holeshot', 'washboard', 'mx-tabletop', 'canyon', 'mx-rhythm', 'mx-arena', 'coil'],
    },
    {
      id: 'desert', name: 'DESERT 1000', mode: 'unlimited', classes: ['truck', 'buggy', 'bike', 'quad'], ...MONEY, startNitro: 4, prizes: [14000, 9000, 6000, 3000],
      tracks: ['dustdevil', 'baja-drylake', 'canyon', 'baja-canyon', 'spine', 'baja-coast', 'coil'],
    },
    {
      id: 'grand', name: 'GRAND TOUR', mode: 'unlimited', classes: ALL, ...MONEY, prizes: [15000, 10000, 6000, 3000],
      tracks: ['rookie', 'mx-holeshot', 'baja-drylake', 'crossfire', 'mx-tabletop', 'canyon', 'chain', 'mx-rhythm', 'baja-coast', 'anvil', 'mx-arena', 'baja-canyon'],
    },
  ],
};
