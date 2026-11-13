import type { RGB } from '../content/themes';
import type { LayerRect, VehicleDef } from '../content/types';
import { tokenColor } from './sprites';

export interface Pose {
  /** -1..1, turns the front wheels and leans anything with a rider. */
  steer: number;
  /** Height off the ground in world pixels. */
  lift: number;
  nitro: boolean;
  lights: boolean;
}

const SUB = 3;
const css = (c: RGB): string => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const isWheel = (r: LayerRect) => r[4] === 'tyre' || r[4] === 'tread';

/**
 * Draws a vehicle fresh every frame from its slice stack: smooth at any angle and zoom, front wheels
 * turned to the steering, the upper body leaning into corners, a soft shadow that parts from it in the air.
 * The slices are the same ones the retro sprites are baked from.
 */
export function drawLive(
  c: CanvasRenderingContext2D, v: VehicleDef, body: RGB,
  x: number, y: number, heading: number, pose: Pose, size = 1,
): void {
  const layers = v.layers;
  const top = layers.length;
  const lift = pose.lift;

  // Shadow: the low slices' outline, pushed away from the light and softened.
  c.save();
  c.translate(x + (1.6 + lift * 0.5) * size, y + (2.2 + lift * 0.7) * size);
  c.rotate(heading);
  c.scale(size, size);
  c.fillStyle = `rgba(0,0,0,${Math.max(0.12, 0.34 - lift * 0.02)})`;
  c.shadowColor = 'rgba(0,0,0,0.5)';
  c.shadowBlur = (2 + lift * 0.6) * size * c.getTransform().a * 0.5;
  for (let z = 0; z < Math.min(4, top); z++) for (const r of layers[z]) c.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
  c.restore();

  if (pose.lights) {
    // Headlight pool thrown ahead.
    c.save();
    c.translate(x, y - lift);
    c.rotate(heading);
    c.scale(size, size);
    c.globalCompositeOperation = 'lighter';
    const beam = c.createRadialGradient(8, 0, 1, 22, 0, 26);
    beam.addColorStop(0, 'rgba(255,240,190,0)');
    beam.addColorStop(0.25, 'rgba(255,240,190,0.2)');
    beam.addColorStop(1, 'rgba(255,240,190,0)');
    c.fillStyle = beam;
    c.beginPath();
    c.moveTo(5, -2);
    c.lineTo(46, -17);
    c.lineTo(46, 17);
    c.lineTo(5, 2);
    c.fill();
    c.restore();
  }

  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  // Riders and tall bodies tip into the turn: upper slices slide sideways.
  const lean = pose.steer * (v.radius < 4 ? 0.42 : 0.12);
  for (let z = 0; z < top; z++) {
    for (let k = 0; k < SUB; k++) {
      const hgt = z + k / SUB;
      const side = (Math.max(0, hgt - 2) * lean) * size;
      c.save();
      c.translate(x - sin * side, y + cos * side - (lift + hgt) * size);
      c.rotate(heading);
      c.scale(size, size);
      // Lower slices read as the sides, so they sit darker; the top of each slice catches the light.
      const light = (k === SUB - 1 ? 1 : 0.8) * (0.84 + 0.24 * (hgt / top));
      for (const r of layers[z]) {
        c.fillStyle = css(tokenColor(r[4], body, (r[5] ?? 1) * light));
        const w = r[2] - r[0];
        const h = r[3] - r[1];
        if (isWheel(r) && r[0] > 0 && w > h * 0.6) {
          // Front wheels turn with the steering.
          c.save();
          c.translate(r[0] + w / 2, r[1] + h / 2);
          c.rotate(pose.steer * 0.5);
          c.fillRect(-w / 2, -h / 2, w, h);
          c.restore();
        } else if (isWheel(r) || w < 1.2 || h < 1.2) {
          c.fillRect(r[0], r[1], w, h);
        } else {
          c.beginPath();
          c.roundRect(r[0], r[1], w, h, 0.7);
          c.fill();
        }
      }
      c.restore();
    }
  }

  if (pose.nitro) {
    c.save();
    c.translate(x, y - (lift + 3) * size);
    c.rotate(heading);
    c.scale(size, size);
    c.globalCompositeOperation = 'lighter';
    const back = layers[3]?.[0]?.[0] ?? -6;
    const flame = c.createRadialGradient(back, 0, 0.5, back - 5, 0, 8);
    flame.addColorStop(0, 'rgba(255,240,170,0.95)');
    flame.addColorStop(0.4, 'rgba(255,140,40,0.6)');
    flame.addColorStop(1, 'rgba(255,80,20,0)');
    c.fillStyle = flame;
    c.beginPath();
    c.ellipse(back - 4, 0, 8, 3, 0, 0, 6.3);
    c.fill();
    c.restore();
  }
}
