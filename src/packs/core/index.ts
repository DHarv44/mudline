import type { Pack } from '../../content/types';
import { CLASSIC, WORKSHOP } from './parts';
import { STADIUM_IDS, TRACKS } from './tracks';
import { VEHICLES } from './vehicles';

/** The base game: both modes, the stadium tracks and trucks, and both parts catalogues. */
export const corePack: Pack = {
  modes: [
    { id: 'classic', name: 'CLASSIC', style: 'retro', shop: 'shop' },
    { id: 'unlimited', name: 'UNLIMITED', style: 'modern', shop: 'garage' },
  ],
  series: [
    {
      id: 'classic-cup', name: 'STADIUM CUP', mode: 'classic', tracks: STADIUM_IDS, vehicles: ['stadium'],
      catalog: 'classic', startMoney: 5000, startNitro: 3, prizes: [10000, 7000, 4000, 2000],
    },
  ],
  classes: [
    { id: 'bike', name: 'DIRT BIKES' },
    { id: 'quad', name: 'QUADS' },
    { id: 'truck', name: 'TRUCKS' },
    { id: 'buggy', name: 'BUGGIES' },
  ],
  tracks: TRACKS,
  vehicles: VEHICLES,
  catalogs: [CLASSIC, WORKSHOP],
};
