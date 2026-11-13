import type { Catalog, PartCategory, PartTier, Stats } from '../../content/types';

/** Arcade-style parts: five plain levels of each, every level the same step up. */
function levels(step: Partial<Stats>): PartTier[] {
  const tiers: PartTier[] = [];
  for (let l = 0; l <= 5; l++) {
    const mods: Partial<Stats> = {};
    for (const k of Object.keys(step) as (keyof Stats)[]) mods[k] = (step[k] ?? 0) * l;
    tiers.push({ name: l === 0 ? 'STOCK' : `LEVEL ${l}`, price: l === 0 ? 0 : 1000 + 3000 * l, mods });
  }
  return tiers;
}

export const CLASSIC: Catalog = {
  id: 'classic',
  nitroPrice: 1500,
  categories: [
    { id: 'tires', name: 'TIRES', visual: 'wheel', tiers: levels({ grip: 0.2, turn: 0.023, mud: 0.12 }) },
    { id: 'shocks', name: 'SHOCKS', visual: 'ride', tiers: levels({ land: 0.051, whoop: 0.0084 }) },
    { id: 'accel', name: 'ENGINE', visual: 'exhaust', tiers: levels({ accel: 0.192 }) },
    { id: 'speed', name: 'TOP SPEED', visual: 'none', tiers: levels({ top: 0.1087 }) },
  ],
};

function named(id: string, name: string, visual: PartCategory['visual'], rows: [string, number, Partial<Stats>][]): PartCategory {
  return { id, name, visual, tiers: [{ name: 'STOCK', price: 0, mods: {} }, ...rows.map(([n, price, mods]) => ({ name: n, price, mods }))] };
}

/** The full workshop: named parts, more systems, and parts that trade one strength for another. */
export const WORKSHOP: Catalog = {
  id: 'workshop',
  nitroPrice: 1500,
  categories: [
    named('tires', 'TIRES', 'wheel', [
      ['ALL-TERRAIN', 3000, { grip: 0.15, mud: 0.1 }],
      ['MUD CLAWS', 6000, { grip: 0.3, mud: 0.22 }],
      ['PADDLES', 10000, { grip: 0.45, mud: 0.34 }],
      ['PRO COMPS', 15000, { grip: 0.6, mud: 0.46, turn: 0.06 }],
    ]),
    named('suspension', 'SUSPENSION', 'ride', [
      ['GAS SHOCKS', 3000, { land: 0.05, whoop: 0.01 }],
      ['LONG TRAVEL', 6000, { land: 0.1, whoop: 0.02 }],
      ['BYPASS SHOCKS', 10000, { land: 0.15, whoop: 0.03, jump: 0.05 }],
      ['RACE COILOVERS', 15000, { land: 0.2, whoop: 0.04, jump: 0.1 }],
    ]),
    named('engine', 'ENGINE', 'exhaust', [
      ['PORTED HEAD', 4000, { accel: 0.15 }],
      ['BIG BORE', 8000, { accel: 0.3 }],
      ['STROKER', 12000, { accel: 0.45 }],
      ['RACE BUILD', 18000, { accel: 0.62, top: 0.04 }],
    ]),
    named('gearbox', 'GEARBOX', 'none', [
      ['CLOSE RATIO', 4000, { top: 0.07 }],
      ['SPORT BOX', 8000, { top: 0.14 }],
      ['RACE BOX', 12000, { top: 0.21 }],
      ['SEQUENTIAL', 18000, { top: 0.3 }],
    ]),
    named('chassis', 'CHASSIS', 'none', [
      ['LIGHT PANELS', 5000, { turn: 0.05, air: 0.2, mass: -0.05 }],
      ['TUBE FRAME', 10000, { turn: 0.1, air: 0.4, mass: -0.1 }],
      ['CARBON SHELL', 16000, { turn: 0.15, air: 0.6, mass: -0.15 }],
    ]),
    named('nitrous', 'NITROUS', 'bottle', [
      ['WET KIT', 4000, { boostTime: 0.25 }],
      ['DIRECT PORT', 9000, { boostTime: 0.4, boost: 0.07 }],
      ['TWIN STAGE', 15000, { boostTime: 0.6, boost: 0.13 }],
    ]),
  ],
};
