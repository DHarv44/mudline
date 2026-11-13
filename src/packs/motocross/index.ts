import type { Pack } from '../../content/types';
import { TRACKS } from './tracks';
import { VEHICLES } from './vehicles';

/** Motocross courses, the dirt bikes and the quads. Championships that use them are in the tour pack. */
export const motocrossPack: Pack = {
  tracks: TRACKS,
  vehicles: VEHICLES,
};
