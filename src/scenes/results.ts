import { VIEW_W } from '../core/config';
import { trackById } from '../content/tracks';
import { TRUCK_COLORS } from '../content/trucks';
import type { Game, Scene } from '../game/game';
import { PLACE } from '../render/hud';
import { drawTruck } from '../render/truckSprites';

function clock(t: number): string {
  if (t < 0) return '--:--.-';
  const m = Math.floor(t / 60);
  const sec = t - m * 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(1)}`;
}

export function resultsScene(g: Game): Scene {
  const ses = g.session;
  const champ = ses.mode === 'champ';
  let t = 0;

  return {
    update(dt) {
      t += dt;
      if (t > 0.6 && (g.input.anyHit('ok') >= 0 || g.screen.mouse.click)) {
        if (g.net.online) {
          if (g.net.isHost) {
            g.sfx.play('ok');
            g.net.send({ t: 'next' });
          }
          return;
        }
        g.sfx.play('ok');
        if (!champ) g.go('tracks');
        else if (ses.lastRound) g.go('champion');
        else g.go('shop');
      }
    },
    draw() {
      const s = g.screen;
      s.rect(0, 0, VIEW_W, 270, '#14121c');
      s.text(trackById(ses.trackId).name, VIEW_W / 2, 16, '#ffb020', { align: 'center', size: 16 });
      ses.results.forEach((r, i) => {
        if (t < 0.25 * i) return;
        const y = 58 + i * 42;
        const d = ses.drivers[r.slot];
        s.rect(30, y, 420, 34, '#22202e');
        s.rect(30, y, 4, 34, TRUCK_COLORS[r.slot].css);
        s.text(PLACE[r.place], 44, y + 13, r.place === 0 ? '#ffd84a' : '#fff');
        drawTruck(s.ctx, r.slot, 96, y + 20, 0, 0, 1.5);
        s.text(r.name, 124, y + 13, d.device !== null ? '#fff' : '#9a9aa8');
        s.text(clock(r.time), 190, y + 13, '#c8c8d4');
        if (champ) {
          s.text(`+$${r.prize + r.cash}`, 350, y + 7, '#58e070', { align: 'right' });
          s.text(`${d.points} PTS`, 350, y + 19, '#58c8ff', { align: 'right' });
          s.text(`$${d.money}`, 440, y + 13, '#ffd84a', { align: 'right' });
        }
      });
      const wait = g.net.online && !g.net.isHost;
      if (t > 1.2 && (wait || s.blink())) s.text(wait ? 'WAITING FOR HOST' : 'PRESS NITRO', VIEW_W / 2, 240, wait ? '#9a9aa8' : '#d8d8e0', { align: 'center' });
    },
  };
}
