import type { Pack, TrackDef } from '../../content/types';

type Pt = [number, number];
const round = (p: Pt): Pt => [Math.round(p[0]), Math.round(p[1])];

/** A three-lobed knot: the road passes over and under itself three times. */
function pretzel(): Pt[] {
  const pts: Pt[] = [];
  const N = 24;
  for (let k = 0; k < N; k++) {
    const t = (k / N) * Math.PI * 2 + 0.35;
    pts.push(round([480 + (Math.sin(t) + 2 * Math.sin(2 * t)) * 148, 290 + (Math.cos(t) - 2 * Math.cos(2 * t)) * 76]));
  }
  return pts;
}

/** Two turns of a spiral into the middle, then straight back out over both coils on bridges. */
function spiral(): Pt[] {
  const at = (r: number, a: number): Pt => round([480 + r * Math.cos(a) * 1.75, 270 + r * Math.sin(a) * 0.9]);
  const pts: Pt[] = [];
  const turns = Math.PI * 4;
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * turns;
    pts.push(at(200 - (120 * a) / turns, a));
  }
  // Hook round the middle and head out along one spoke.
  pts.push(at(80, turns), at(52, turns + 0.9), at(42, turns + 1.9), at(96, turns + 2.3), at(150, turns + 2.3), at(205, turns + 2.3));
  // Sweep round the outside back to the start.
  pts.push(at(244, 2.5), at(250, 3.4), at(250, 4.3), at(242, 5.2), at(222, 5.9));
  return pts;
}

/** A long lap that doubles back through its own middle twice. */
const SWITCHYARD: Pt[] = [
  [480, 70], [760, 60], [890, 130], [860, 250], [700, 300], [480, 270], [260, 240], [110, 300], [90, 410], [200, 480],
  [480, 470], [760, 480], [880, 400], [840, 290], [700, 200], [560, 170], [480, 270], [420, 370], [300, 380], [180, 330],
  [150, 200], [220, 100],
];

const TRACKS: TrackDef[] = [
  {
    id: 'cc-pretzel', name: 'PRETZEL LOGIC', size: [960, 540], theme: 'loam', laps: 2, half: 16, points: pretzel(),
    features: [{ type: 'mud', at: 0.22, len: 40 }, { type: 'water', at: 0.58, len: 34 }, { type: 'sand', at: 0.84, len: 70 }],
  },
  {
    id: 'cc-spiral', name: 'CORKSCREW', size: [960, 540], theme: 'desert', laps: 2, half: 16, points: spiral(),
    features: [{ type: 'sand', at: 0.12, len: 90 }, { type: 'water', at: 0.37, len: 34 }, { type: 'mud', at: 0.9, len: 44 }],
  },
  {
    id: 'cc-switchyard', name: 'SWITCHYARD', size: [960, 540], theme: 'clay', laps: 2, half: 16, points: SWITCHYARD,
    features: [{ type: 'water', at: 0.15, len: 34 }, { type: 'mud', at: 0.45, len: 44 }, { type: 'sand', at: 0.74, len: 80 }],
  },
];

/** Courses built around bridges. They only make sense where crossovers are bridged, so they race in classes. */
export const circuitsPack: Pack = { tracks: TRACKS };
