import { SLOTS, VIEW_W } from '../core/config';
import { CPU_NAMES, PAINTS } from '../content/drivers';
import { modeById, seriesById, vehicleById, vehiclesIn } from '../content/registry';
import type { Game, Scene } from '../game/game';
import { DEVICES } from '../input/devices';
import { drawVehicle } from '../render/sprites';
import { backdrop, panel, UI } from '../ui/kit';

/** Drivers join by pressing gas on their own keys or pad and pick a vehicle; empty seats go to the computer. */
export function lobbyScene(g: Game, arg: { series: string; mode: 'champ' | 'quick' }): Scene {
  const series = seriesById(arg.series);
  const style = modeById(series.mode).style;
  const rides = vehiclesIn(series);
  const seats: (number | null)[] = new Array(SLOTS).fill(null);
  const pick: number[] = seats.map((_, i) => i % rides.length);
  let spin = 0;

  const start = () => {
    g.sfx.play('ok');
    g.session.setup(seats, arg.mode, series.id, { vehicles: pick.map((p) => rides[p]) });
    g.go(arg.mode === 'champ' ? 'race' : 'tracks');
  };

  return {
    update(dt) {
      spin += dt;
      // A lone mouse user still needs a way in: a click seats the keyboard, a second click starts.
      if (g.screen.mouse.click) {
        if (!seats.some((s) => s !== null)) seats[0] = 0;
        else {
          start();
          return;
        }
      }
      for (let dev = 0; dev < DEVICES; dev++) {
        const seat = seats.indexOf(dev);
        if (seat < 0) {
          if (g.input.hit(dev, 'gas') || g.input.hit(dev, 'ok')) {
            const free = seats.indexOf(null);
            if (free >= 0) {
              seats[free] = dev;
              g.sfx.play('ok');
            }
          } else if (g.input.hit(dev, 'back') && seats.every((s) => s === null)) {
            g.sfx.play('back');
            g.go('events', series.mode);
            return;
          }
          continue;
        }
        const d = (g.input.hit(dev, 'right') ? 1 : 0) - (g.input.hit(dev, 'left') ? 1 : 0);
        if (d && rides.length > 1) {
          pick[seat] = (pick[seat] + d + rides.length) % rides.length;
          g.sfx.play('move');
        }
        if (g.input.hit(dev, 'back')) {
          seats[seat] = null;
          g.sfx.play('back');
        } else if (g.input.hit(dev, 'ok') || g.input.hit(dev, 'start')) {
          start();
          return;
        }
      }
    },
    draw() {
      const s = g.screen;
      backdrop(s, series.name, arg.mode === 'champ' ? 'CHAMPIONSHIP' : 'SINGLE RACE');
      const w = 108;
      for (let i = 0; i < SLOTS; i++) {
        const x = 12 + i * (w + 8);
        const dev = seats[i];
        const col = PAINTS[i];
        panel(s, x, 46, w, 172, dev !== null, col.css);
        s.rect(x, 46, w, 4, col.css);
        s.rect(x + 14, 62, 80, 62, '#b89058');
        s.ctx.imageSmoothingEnabled = style === 'modern';
        drawVehicle(s.ctx, rides[pick[i]], i, style, x + 54, 100, dev === null ? -Math.PI / 2 : spin * 2 + i, 0, 2.6);
        s.ctx.imageSmoothingEnabled = false;
        const name = vehicleById(rides[pick[i]]).name;
        if (dev === null) {
          s.text(CPU_NAMES[i], x + w / 2, 134, UI.dim, { align: 'center' });
          s.text('CPU', x + w / 2, 148, UI.faint, { align: 'center' });
          if (s.blink()) s.text('PRESS GAS', x + w / 2, 196, UI.text, { align: 'center' });
        } else {
          const p = seats.slice(0, i + 1).filter((k) => k !== null).length;
          s.text(`PLAYER ${p}`, x + w / 2, 134, '#fff', { align: 'center' });
          s.text(g.input.label(dev), x + w / 2, 148, col.css, { align: 'center' });
          s.text('READY', x + w / 2, 196, UI.good, { align: 'center' });
        }
        // Long names drop to a smaller size so they stay inside the card.
        const many = dev !== null && rides.length > 1;
        s.text(many ? `< ${name} >` : name, x + w / 2, 172, dev === null ? UI.faint : UI.gold, { align: 'center', size: name.length > 9 ? 6 : 8 });
      }
      if (seats.some((d) => d !== null) && s.blink()) s.text('PRESS NITRO TO START', VIEW_W / 2, 238, UI.gold, { align: 'center' });
    },
  };
}
