import { VIEW_H, VIEW_W } from '../core/config';

export interface TextOpts { align?: CanvasTextAlign; size?: number; shadow?: string | false }

export const FONT = '"Press Start 2P", monospace';

/** The game draws in a fixed 480x270 space that is scaled up to fill the window. */
export class Screen {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  crt = true;
  /** Pointer position in the 480x270 game space; `click` and `moved` are true for one frame. */
  mouse = { x: -1, y: -1, click: false, moved: false };
  private scale = 1;
  private ox = 0;
  private oy = 0;

  constructor() {
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    window.addEventListener('resize', () => this.resize());
    this.resize();
    const at = (e: MouseEvent) => {
      const dpr = window.devicePixelRatio || 1;
      this.mouse.x = (e.clientX * dpr - this.ox) / this.scale;
      this.mouse.y = (e.clientY * dpr - this.oy) / this.scale;
    };
    window.addEventListener('mousemove', (e) => {
      at(e);
      this.mouse.moved = true;
    });
    window.addEventListener('mousedown', (e) => {
      at(e);
      if (e.button === 0) this.mouse.click = true;
    });
  }

  /** Clears the one-frame mouse flags; called after each update. */
  endInput(): void {
    this.mouse.click = false;
    this.mouse.moved = false;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(window.innerWidth * dpr));
    const h = Math.max(1, Math.round(window.innerHeight * dpr));
    this.canvas.width = w;
    this.canvas.height = h;
    this.scale = Math.min(w / VIEW_W, h / VIEW_H);
    this.ox = Math.round((w - VIEW_W * this.scale) / 2);
    this.oy = Math.round((h - VIEW_H * this.scale) / 2);
  }

  begin(): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.scale, 0, 0, this.scale, this.ox, this.oy);
    c.imageSmoothingEnabled = false;
    c.save();
    c.beginPath();
    c.rect(0, 0, VIEW_W, VIEW_H);
    c.clip();
  }

  end(): void {
    const c = this.ctx;
    if (this.crt) {
      c.fillStyle = 'rgba(0,0,0,0.16)';
      for (let y = 0; y < VIEW_H; y++) c.fillRect(0, y + 0.6, VIEW_W, 0.4);
      const g = c.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.38)');
      c.fillStyle = g;
      c.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    c.restore();
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  text(s: string, x: number, y: number, color = '#fff', o: TextOpts = {}): void {
    const c = this.ctx;
    const size = o.size ?? 8;
    c.font = `${size}px ${FONT}`;
    c.textBaseline = 'top';
    c.textAlign = o.align ?? 'left';
    if (o.shadow !== false) {
      c.fillStyle = o.shadow ?? '#000';
      c.fillText(s, x + size / 8, y + size / 8);
    }
    c.fillStyle = color;
    c.fillText(s, x, y);
  }

  /** Slow blink for prompts. */
  blink(period = 0.8): boolean {
    return (performance.now() / 1000) % period < period * 0.6;
  }
}
