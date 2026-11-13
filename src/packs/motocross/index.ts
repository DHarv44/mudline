import type { Pack } from '../../content/types';
import { TRACKS } from './tracks';
import { VEHICLES } from './vehicles';

export const motocrossPack: Pack = {
  series: [
    {
      id: 'motocross', name: 'MOTOCROSS', mode: 'unlimited', tracks: TRACKS.map((t) => t.id), vehicles: VEHICLES.map((v) => v.id),
      catalog: 'workshop', startMoney: 6000, startNitro: 3, prizes: [12000, 8000, 5000, 3000],
    },
  ],
  tracks: TRACKS,
  vehicles: VEHICLES,
};
