import type { Game } from '../game/game';

/** A vertical list any player can drive with their own controls, or with the mouse. */
export class ListMenu {
  sel = 0;
  /** Where the list was last drawn, so the mouse can find its rows. */
  private at: { x: number; y: number; lineH: number; align: CanvasTextAlign } | null = null;

  constructor(public items: string[]) {}

  /** The row under the mouse, or -1. */
  private hover(g: Game): number {
    const a = this.at;
    if (!a) return -1;
    const m = g.screen.mouse;
    const i = Math.floor((m.y - (a.y - (a.lineH - 8) / 2)) / a.lineH);
    if (i < 0 || i >= this.items.length) return -1;
    const w = this.items[i].length * 8 + 16;
    const left = a.align === 'center' ? a.x - w / 2 : a.x - 14;
    return m.x >= left && m.x <= left + w ? i : -1;
  }

  /** Returns the chosen index when confirmed, otherwise -1. */
  nav(g: Game): number {
    const n = this.items.length;
    if (g.input.anyHit('up') >= 0) {
      this.sel = (this.sel + n - 1) % n;
      g.sfx.play('move');
    }
    if (g.input.anyHit('down') >= 0) {
      this.sel = (this.sel + 1) % n;
      g.sfx.play('move');
    }
    const m = g.screen.mouse;
    if (m.moved || m.click) {
      const h = this.hover(g);
      if (h >= 0 && h !== this.sel) {
        this.sel = h;
        g.sfx.play('move');
      }
      if (h >= 0 && m.click) {
        g.sfx.play('ok');
        return h;
      }
    }
    if (g.input.anyHit('ok') >= 0) {
      g.sfx.play('ok');
      return this.sel;
    }
    return -1;
  }

  draw(g: Game, x: number, y: number, lineH = 16, align: CanvasTextAlign = 'left'): void {
    this.at = { x, y, lineH, align };
    this.items.forEach((it, i) => {
      const on = i === this.sel;
      if (on && align === 'left') g.screen.text('>', x - 12, y + i * lineH, '#ffd84a');
      g.screen.text(it, x, y + i * lineH, on ? '#ffd84a' : '#d8d8e0', { align });
    });
  }
}
