export const VIEW_W = 480;
export const VIEW_H = 270;
export const SIM_DT = 1 / 120;
export const TRUCK_R = 4.5;
export const SLOTS = 4;
/** Checkpoints per lap; a lap only counts when they are crossed in order. */
export const GATES = 8;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
