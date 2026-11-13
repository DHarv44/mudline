import { SLOTS, VIEW_W } from '../core/config';
import { CPU_NAMES, TRUCK_COLORS } from '../content/trucks';
import type { Game, Scene } from '../game/game';
import { DEVICES } from '../input/devices';
import { drawTruck } from '../render/truckSprites';

/** Drivers join by pressing gas on their own keys or pad; empty seats go to the computer. */
export function lobbyScene(g: Game, mode: 'champ' | 'quick'): Scene {
  const seats: (number | null)[] = new Array(SLOTS).fill(null);
  let spin = 0;

  return {
    update(dt) {
      spin += dt;
      for (let dev = 0; dev < DEVICES; dev++) {
        const seat = seats.indexOf(dev);
        const press = g.input.hit(dev, 'gas') || g.input.hit(dev, 'ok');
        if (seat < 0) {
          if (press) {
            const free = seats.indexOf(null);
            if (free >= 0) {
              seats[free] = dev;
              g.sfx.play('ok');
            }
          } else if (g.input.hit(dev, 'back') && seats.every((s) => s === null)) {
            g.sfx.play('back');
            g.go('title');
            return;
          }
        } else if (g.input.hit(dev, 'back')) {
          seats[seat] = null;
          g.sfx.play('back');
        } else if (g.input.hit(dev, 'ok') || g.input.hit(dev, 'start')) {
          g.sfx.play('ok');
          g.session.setup(seats, mode);
          g.go(mode === 'champ' ? 'race' : 'tracks');
          return;
        }
      }
    },
    draw() {
      const s = g.screen;
      s.rect(0, 0, VIEW_W, 270, '#14121c');
      s.text(mode === 'champ' ? 'CHAMPIONSHIP' : 'QUICK RACE', VIEW_W / 2, 18, '#ffb020', { align: 'center', size: 16 });
      const w = 108;
      for (let i = 0; i < SLOTS; i++) {
        const x = 12 + i * (w + 8);
        const dev = seats[i];
        const col = TRUCK_COLORS[i];
        s.rect(x, 56, w, 150, '#22202e');
        s.rect(x, 56, w, 4, col.css);
        s.rect(x + 14, 78, 80, 62, '#c89c5e');
        drawTruck(s.ctx, i, x + 54, 116, dev === null ? -Math.PI / 2 : spin * 2 + i, 0, 3);
        if (dev === null) {
          s.text(CPU_NAMES[i], x + w / 2, 152, '#8a8a98', { align: 'center' });
          s.text('CPU', x + w / 2, 168, '#5c5c6a', { align: 'center' });
          if (s.blink()) s.text('PRESS GAS', x + w / 2, 186, '#d8d8e0', { align: 'center' });
        } else {
          const p = seats.slice(0, i + 1).filter((d) => d !== null).length;
          s.text(`PLAYER ${p}`, x + w / 2, 152, '#fff', { align: 'center' });
          s.text(g.input.label(dev), x + w / 2, 168, col.css, { align: 'center' });
          s.text('READY', x + w / 2, 186, '#58e070', { align: 'center' });
        }
      }
      if (seats.some((d) => d !== null) && s.blink()) s.text('PRESS NITRO TO START', VIEW_W / 2, 232, '#ffd84a', { align: 'center' });
    },
  };
}
