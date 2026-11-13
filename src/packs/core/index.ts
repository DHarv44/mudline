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
    // Bikes get tight rhythm sections; trucks get one big hit per straight and room to land it.
    { id: 'bike', name: 'DIRT BIKES', course: { rhythm: 4, gap: 30, power: 1.1, big: 1.35, ramp: 10, whoops: 0.3, minRun: 44 } },
    { id: 'quad', name: 'QUADS', course: { rhythm: 3, gap: 34, power: 1.05, big: 1.25, ramp: 11, whoops: 0.3, minRun: 50 } },
    { id: 'truck', name: 'TRUCKS', course: { rhythm: 1, gap: 80, power: 1.2, big: 1.45, ramp: 16, whoops: 0.15, minRun: 80 } },
    { id: 'buggy', name: 'BUGGIES', course: { rhythm: 2, gap: 56, power: 1.1, big: 1.35, ramp: 14, whoops: 0.22, minRun: 80 } },
  ],
  tracks: TRACKS,
  vehicles: VEHICLES,
  catalogs: [CLASSIC, WORKSHOP],
};
