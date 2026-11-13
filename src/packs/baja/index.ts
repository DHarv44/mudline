import type { Pack } from '../../content/types';
import { TRACKS } from './tracks';
import { VEHICLES } from './vehicles';

/** Long-distance desert racing. The series also runs the base game's four long courses. */
export const bajaPack: Pack = {
  series: [
    {
      id: 'baja', name: 'BAJA', mode: 'unlimited',
      tracks: ['dustdevil', TRACKS[0].id, 'canyon', TRACKS[1].id, 'spine', TRACKS[2].id, 'coil'],
      vehicles: ['trophy', 'dunebug', 'prerunner'],
      catalog: 'workshop', startMoney: 6000, startNitro: 4, prizes: [14000, 9000, 6000, 3000],
    },
  ],
  tracks: TRACKS,
  vehicles: VEHICLES,
};
