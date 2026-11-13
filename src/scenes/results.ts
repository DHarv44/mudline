import { VIEW_W } from '../core/config';
import { PAINTS } from '../content/drivers';
import { mulberry32 } from '../core/rng';
import { Session } from '../game/session';
import { trackById } from '../content/registry';
import type { Game, Scene } from '../game/game';
import { PLACE } from '../render/hud';
import { drawVehicle } from '../render/sprites';
import { backdrop, panel, UI } from '../ui/kit';

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
        else if (ses.lastRound) {
          Session.clearSave();
          g.go('champion');
        } else if (ses.shopScene === 'garage') {
          // Back to the garage with the next round ready; rivals have done their shopping.
          ses.aiShop(mulberry32(Date.now() & 0xffff));
          ses.round++;
          ses.save();
          g.go('garage');
        } else g.go('shop');
      }
    },
    draw() {
      const s = g.screen;
      backdrop(s, trackById(ses.trackId).name, champ ? `ROUND ${ses.round + 1} OF ${ses.order.length}` : 'SINGLE RACE');
      ses.results.forEach((r, i) => {
        if (t < 0.25 * i) return;
        const y = 46 + i * 44;
        const d = ses.drivers[r.slot];
        panel(s, 30, y, 420, 36, r.place === 0, PAINTS[d.color].css);
        s.rect(30, y, 4, 36, PAINTS[d.color].css);
        s.text(PLACE[r.place], 44, y + 14, r.place === 0 ? UI.gold : '#fff');
        s.ctx.imageSmoothingEnabled = ses.style === 'modern';
        drawVehicle(s.ctx, d.vehicle, d.color, ses.style, 98, y + 21, 0, 0, 1.4);
        s.ctx.imageSmoothingEnabled = false;
        s.text(r.name, 126, y + 14, d.device !== null ? '#fff' : UI.dim);
        s.text(clock(r.time), 192, y + 14, '#c8c8d4');
        if (champ) {
          s.text(`+$${r.prize + r.cash}`, 350, y + 8, UI.good, { align: 'right' });
          s.text(`${d.points} PTS`, 350, y + 20, UI.cool, { align: 'right' });
          s.text(`$${d.money}`, 440, y + 14, UI.gold, { align: 'right' });
        }
      });
      const wait = g.net.online && !g.net.isHost;
      if (t > 1.2 && (wait || s.blink())) s.text(wait ? 'WAITING FOR HOST' : 'PRESS NITRO', VIEW_W / 2, 240, wait ? UI.dim : UI.text, { align: 'center' });
    },
  };
}
