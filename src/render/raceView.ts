import { VIEW_H, VIEW_W } from '../core/config';
import { PAINTS } from '../content/drivers';
import { vehicleById } from '../content/registry';
import { THEMES } from '../content/themes';
import type { BuiltTrack } from '../game/game';
import type { Race } from '../sim/race';
import type { Truck } from '../sim/truck';
import { Deck, paintDecks } from './bridgeArt';
import type { Screen } from './screen';
import { drawVehicle, Style } from './sprites';
import { TrackGL } from './trackGL';
import { drawLive } from './vehicleLive';

/**
 * Draws the world for one race. The retro style shows the painted track with baked sprites, as an arcade
 * cabinet would. The modern style draws the track on the graphics card, follows the player with the camera,
 * and draws vehicles live; where the card is unavailable it falls back to a painted track.
 */
export class RaceView {
  private canvas: HTMLCanvasElement;
  private mctx: CanvasRenderingContext2D;
  private k: number;
  private cx: number;
  private cy: number;
  private zoom: number;
  private t = 0;
  private modern: boolean;
  private moving: boolean;
  private gl: TrackGL | null = null;
  private decks: Deck[] = [];
  private night: boolean;
  private dirty = false;

  constructor(private race: Race, built: BuiltTrack, private style: Style) {
    const tr = race.track;
    const theme = THEMES[tr.def.theme] ?? THEMES.stadium;
    this.modern = style === 'modern';
    this.night = this.modern && !!theme.night;
    this.gl = this.modern ? TrackGL.get() : null;
    this.canvas = document.createElement('canvas');
    if (this.gl) {
      // Only the tyre marks are kept as a picture; the card draws the track itself.
      this.k = Math.min(2, 1440 / tr.w);
      this.canvas.width = Math.round(tr.w * this.k);
      this.canvas.height = Math.round(tr.h * this.k);
      this.mctx = this.canvas.getContext('2d')!;
      this.gl.load(tr, theme);
    } else {
      this.k = built.k;
      this.canvas.width = built.art.width;
      this.canvas.height = built.art.height;
      this.mctx = this.canvas.getContext('2d')!;
      this.mctx.drawImage(built.art, 0, 0);
    }
    if (this.modern) this.decks = paintDecks(tr);
    this.cx = tr.w / 2;
    this.cy = tr.h / 2;
    this.zoom = VIEW_W / tr.w;
    this.moving = this.modern || tr.w > VIEW_W;
    if (this.moving) this.aim(1);
  }

  /** Hands the screen back to opaque drawing when the race view goes away. */
  dispose(s: Screen): void {
    s.through = false;
  }

  update(dt: number): void {
    this.t += dt;
    const m = this.race.marks;
    if (m.length) {
      const k = this.k;
      const c = this.mctx;
      if (this.modern) {
        c.fillStyle = this.gl ? 'rgba(0,0,0,0.3)' : 'rgba(40,24,14,0.16)';
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
      this.dirty = true;
    }
    if (this.gl && this.dirty) {
      this.gl.marks(this.canvas, this.t);
      this.dirty = false;
    }
    if (this.moving) this.aim(1 - Math.exp(-3.5 * dt));
  }

  /** Points the camera. One driver is followed closely, easing out with speed; several are all kept in frame. */
  private aim(f: number): void {
    const tr = this.race.track;
    let who = this.race.trucks.filter((t) => t.human && !t.finished);
    if (!who.length) who = this.race.trucks.filter((t) => t.human);
    const watching = !who.length;
    if (watching) who = this.race.trucks;
    const fit = Math.max(VIEW_W / tr.w, VIEW_H / tr.h);
    let z: number;
    let tx: number;
    let ty: number;
    if (this.modern && who.length === 1) {
      const t = who[0];
      const sp = Math.hypot(t.vx, t.vy);
      z = 1.8 - 0.45 * Math.min(1, sp / 140);
      tx = t.x + t.vx * 0.4;
      ty = t.y + t.vy * 0.4;
    } else {
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
      z = Math.min(this.modern ? 1.5 : 1, VIEW_W / (x1 - x0 + margin * 2), VIEW_H / (y1 - y0 + margin * 2));
      tx = (x0 + x1) / 2;
      ty = (y0 + y1) / 2;
    }
    z = Math.max(fit, z);
    this.zoom += (z - this.zoom) * f;
    const hw = VIEW_W / 2 / this.zoom;
    const hh = VIEW_H / 2 / this.zoom;
    this.cx += (Math.min(tr.w - hw, Math.max(hw, tx)) - this.cx) * f;
    this.cy += (Math.min(tr.h - hh, Math.max(hh, ty)) - this.cy) * f;
  }

  private vehicle(c: CanvasRenderingContext2D, t: Truck): void {
    if (!this.modern) {
      drawVehicle(c, t.vehicle, t.color, this.style, t.x, t.y, t.h, t.z * 1.6);
      return;
    }
    drawLive(c, vehicleById(t.vehicle), PAINTS[t.color].rgb, t.x, t.y, t.h, {
      steer: t.steer, lift: t.z * 1.6, nitro: t.nitroT > 0, lights: this.night,
    });
  }

  draw(s: Screen): void {
    const c = s.ctx;
    const race = this.race;
    const tr = race.track;
    const modern = this.modern;
    if (this.gl) {
      s.through = true;
      this.gl.draw(s, this.cx, this.cy, this.zoom, this.t);
    }
    c.save();
    c.imageSmoothingEnabled = modern;
    c.translate(VIEW_W / 2, VIEW_H / 2);
    c.scale(this.zoom, this.zoom);
    c.translate(-this.cx, -this.cy);
    if (!this.gl) c.drawImage(this.canvas, 0, 0, tr.w, tr.h);

    for (const p of race.pickups) {
      if (p.t < 3 && Math.floor(p.t * 8) % 2 === 0) continue;
      const nitro = p.type === 'nitro';
      if (modern) {
        const y = p.y - 1.5 - Math.sin(this.t * 4 + p.x) * 0.9;
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.beginPath();
        c.ellipse(p.x + 1, p.y + 3.2, 3.4, 1.4, 0, 0, 6.3);
        c.fill();
        c.save();
        c.globalCompositeOperation = 'lighter';
        const glow = c.createRadialGradient(p.x, y, 0.5, p.x, y, 9);
        glow.addColorStop(0, nitro ? 'rgba(70,190,255,0.55)' : 'rgba(110,240,120,0.5)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = glow;
        c.fillRect(p.x - 9, y - 9, 18, 18);
        c.restore();
        c.fillStyle = nitro ? '#1c6fd0' : '#2f9a44';
        c.beginPath();
        c.roundRect(p.x - 2.6, y - 4, 5.2, 8, 1.6);
        c.fill();
        c.fillStyle = nitro ? '#bfe6ff' : '#f6e56a';
        c.fillRect(p.x - 2.6, y - 1.4, 5.2, 1.8);
        continue;
      }
      const bob = Math.sin(this.t * 6 + p.x) > 0 ? 1 : 0;
      const x = Math.round(p.x);
      const y = Math.round(p.y) - bob;
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(x - 3, p.y + 3, 6, 2);
      c.fillStyle = '#101018';
      c.fillRect(x - 4, y - 5, 8, 9);
      c.fillStyle = nitro ? '#38b8ff' : '#3cbc50';
      c.fillRect(x - 3, y - 4, 6, 7);
      c.fillStyle = nitro ? '#ffffff' : '#f8e860';
      c.fillRect(x - 2, y - 2, 4, 2);
    }

    for (const d of this.decks) c.drawImage(d.shadow, d.x + 3, d.y + 4, d.w, d.h);

    if (modern) {
      // Soft round puffs instead of square pixels.
      for (const p of race.parts.list) {
        const a = p.life / p.max;
        c.globalAlpha = Math.min(0.55, a * 0.7);
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (2.4 - a * 1.2), 0, 6.3);
        c.fill();
      }
      c.globalAlpha = 1;
    } else {
      race.parts.draw(c);
    }

    // Under the bridges first, then the decks, then whoever is crossing them.
    const order = [...race.trucks].sort((a, b) => a.y - b.y);
    for (const t of order) if (!t.level) this.vehicle(c, t);
    for (const d of this.decks) c.drawImage(d.art, d.x, d.y, d.w, d.h);
    for (const t of order) if (t.level) this.vehicle(c, t);
    c.restore();
    c.imageSmoothingEnabled = modern;
  }
}
