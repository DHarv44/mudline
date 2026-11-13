import { VIEW_H, VIEW_W } from '../core/config';
import type { BuiltTrack } from '../game/game';
import type { Race } from '../sim/race';
import type { Screen } from './screen';
import { drawVehicle, Style } from './sprites';

/** Draws the world for one race: track, tyre marks, pickups, particles, vehicles. */
export class RaceView {
  private canvas: HTMLCanvasElement;
  private mctx: CanvasRenderingContext2D;
  private k: number;
  private cx: number;
  private cy: number;
  private zoom: number;
  private t = 0;
  private moving: boolean;

  constructor(private race: Race, built: BuiltTrack, private style: Style) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = built.art.width;
    this.canvas.height = built.art.height;
    this.mctx = this.canvas.getContext('2d')!;
    this.mctx.drawImage(built.art, 0, 0);
    this.k = built.k;
    const tr = race.track;
    this.cx = tr.w / 2;
    this.cy = tr.h / 2;
    this.zoom = VIEW_W / tr.w;
    this.moving = tr.w > VIEW_W;
    if (this.moving) this.aim(1);
  }

  update(dt: number): void {
    this.t += dt;
    const m = this.race.marks;
    if (m.length) {
      const k = this.k;
      const c = this.mctx;
      if (this.style === 'modern') {
        c.fillStyle = 'rgba(40,24,14,0.16)';
        for (let i = 0; i < m.length; i += 2) {
          c.beginPath();
          c.arc(m[i] * k, m[i + 1] * k, 0.8 * k, 0, 6.3);
          c.fill();
        }
      } else {
        c.fillStyle = 'rgba(48,28,16,0.3)';
        for (let i = 0; i < m.length; i += 2) c.fillRect(m[i] | 0, m[i + 1] | 0, 1, 1);
      }
      m.length = 0;
    }
    if (this.moving) this.aim(1 - Math.exp(-3.5 * dt));
  }

  /** Large tracks: frame every human vehicle, zooming out as they spread apart. */
  private aim(f: number): void {
    const tr = this.race.track;
    let who = this.race.trucks.filter((t) => t.human && !t.finished);
    if (!who.length) who = this.race.trucks.filter((t) => t.human);
    if (!who.length) who = this.race.trucks;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const t of who) {
      const lx = t.x + t.vx * 0.45;
      const ly = t.y + t.vy * 0.45;
      x0 = Math.min(x0, t.x, lx);
      x1 = Math.max(x1, t.x, lx);
      y0 = Math.min(y0, t.y, ly);
      y1 = Math.max(y1, t.y, ly);
    }
    const margin = 80;
    const minZoom = VIEW_W / tr.w;
    const z = Math.max(minZoom, Math.min(1, VIEW_W / (x1 - x0 + margin * 2), VIEW_H / (y1 - y0 + margin * 2)));
    this.zoom += (z - this.zoom) * f;
    const hw = VIEW_W / 2 / this.zoom;
    const hh = VIEW_H / 2 / this.zoom;
    const tx = Math.min(tr.w - hw, Math.max(hw, (x0 + x1) / 2));
    const ty = Math.min(tr.h - hh, Math.max(hh, (y0 + y1) / 2));
    this.cx += (tx - this.cx) * f;
    this.cy += (ty - this.cy) * f;
  }

  draw(s: Screen): void {
    const c = s.ctx;
    const race = this.race;
    const modern = this.style === 'modern';
    c.save();
    c.imageSmoothingEnabled = modern;
    c.translate(VIEW_W / 2, VIEW_H / 2);
    c.scale(this.zoom, this.zoom);
    c.translate(-this.cx, -this.cy);
    c.drawImage(this.canvas, 0, 0, race.track.w, race.track.h);

    for (const p of race.pickups) {
      if (p.t < 3 && Math.floor(p.t * 8) % 2 === 0) continue;
      const bob = modern ? Math.sin(this.t * 5 + p.x) * 0.8 : Math.sin(this.t * 6 + p.x) > 0 ? 1 : 0;
      const x = modern ? p.x : Math.round(p.x);
      const y = (modern ? p.y : Math.round(p.y)) - bob;
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(x - 3, p.y + 3, 6, 2);
      if (p.type === 'nitro') {
        c.fillStyle = '#101018';
        c.fillRect(x - 3, y - 5, 6, 9);
        c.fillStyle = '#38b8ff';
        c.fillRect(x - 2, y - 4, 4, 7);
        c.fillStyle = '#ffffff';
        c.fillRect(x - 2, y - 2, 4, 2);
        c.fillStyle = '#c0c8d0';
        c.fillRect(x - 1, y - 6, 2, 1);
      } else {
        c.fillStyle = '#101018';
        c.fillRect(x - 4, y - 4, 8, 8);
        c.fillStyle = '#3cbc50';
        c.fillRect(x - 3, y - 3, 6, 6);
        c.fillStyle = '#f8e860';
        c.fillRect(x - 1, y - 2, 2, 4);
        c.fillRect(x - 2, y - 1, 4, 1);
      }
    }

    if (modern) {
      // Soft round puffs instead of square pixels.
      for (const p of race.parts.list) {
        const a = p.life / p.max;
        c.globalAlpha = Math.min(0.7, a);
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (1.6 - a * 0.7), 0, 6.3);
        c.fill();
      }
      c.globalAlpha = 1;
    } else {
      race.parts.draw(c);
    }
    const order = [...race.trucks].sort((a, b) => a.y - b.y);
    for (const t of order) drawVehicle(c, t.vehicle, t.slot, this.style, t.x, t.y, t.h, t.z * 1.6);
    c.restore();
    c.imageSmoothingEnabled = false;
  }
}
