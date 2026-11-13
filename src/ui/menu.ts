import type { Game } from '../game/game';

/** A vertical list any player can drive with their own controls. */
export class ListMenu {
  sel = 0;

  constructor(public items: string[]) {}

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
    if (g.input.anyHit('ok') >= 0) {
      g.sfx.play('ok');
      return this.sel;
    }
    return -1;
  }

  draw(g: Game, x: number, y: number, lineH = 16, align: CanvasTextAlign = 'left'): void {
    this.items.forEach((it, i) => {
      const on = i === this.sel;
      if (on && align === 'left') g.screen.text('>', x - 12, y + i * lineH, '#ffd84a');
      g.screen.text(it, x, y + i * lineH, on ? '#ffd84a' : '#d8d8e0', { align });
    });
  }
}
