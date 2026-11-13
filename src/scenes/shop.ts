import { VIEW_W } from '../core/config';
import { mulberry32 } from '../core/rng';
import { TRUCK_COLORS } from '../content/drivers';
import type { Game, Scene } from '../game/game';
import { drawVehicle } from '../render/sprites';
import { backdrop, panel, UI } from '../ui/kit';

/**
 * The arcade pit shop: between rounds every player spends winnings at once, each in their own column.
 * Rows come from the series' parts catalogue.
 */
export function shopScene(g: Game): Scene {
  const ses = g.session;
  const net = g.net;
  const online = net.online;
  const cats = ses.catalog.categories;
  const rows = [...cats.map((c) => c.id), 'nitro', 'done'];
  // Online, the server holds the money: purchases are requests and the totals come back from it.
  let humans = ses.locals;
  const cursor = humans.map(() => 0);
  const ready = humans.map(() => false);

  return {
    update() {
      humans = ses.locals;
      if (online) ready[0] = net.ready;
      humans.forEach((d, i) => {
        const dev = d.device!;
        // Online one browser is one player, so any keys or pad work.
        const hit = (b: 'up' | 'down' | 'ok' | 'back') => (online ? g.input.anyHit(b) >= 0 : g.input.hit(dev, b));
        if (ready[i]) {
          if (hit('back')) {
            if (online) net.send({ t: 'ready', v: false });
            else ready[i] = false;
          }
          return;
        }
        if (hit('up')) {
          cursor[i] = (cursor[i] + rows.length - 1) % rows.length;
          g.sfx.play('move');
        }
        if (hit('down')) {
          cursor[i] = (cursor[i] + 1) % rows.length;
          g.sfx.play('move');
        }
        if (hit('ok')) {
          const it = rows[cursor[i]];
          if (it === 'done') {
            if (online) net.send({ t: 'ready', v: true });
            else ready[i] = true;
            g.sfx.play('ok');
          } else if (online) {
            net.send({ t: 'buy', item: it });
            g.sfx.play('buy');
          } else {
            g.sfx.play(ses.buy(d, it) ? 'buy' : 'deny');
          }
        }
      });
      if (!online && ready.every(Boolean)) {
        ses.aiShop(mulberry32(Date.now() & 0xffff));
        ses.round++;
        g.go('race');
      }
    },
    draw() {
      const s = g.screen;
      backdrop(s, 'PIT SHOP', `ROUND ${ses.round + 2} NEXT`);
      if (online && net.watching) s.text('WATCHING - YOU RACE NEXT', VIEW_W / 2, 120, UI.cool, { align: 'center' });
      const w = 112;
      const step = Math.min(30, 170 / rows.length);
      const x0 = (VIEW_W - humans.length * (w + 6) + 6) / 2;
      humans.forEach((d, i) => {
        const x = x0 + i * (w + 6);
        panel(s, x, 38, w, 226, !ready[i], TRUCK_COLORS[d.slot].css);
        s.rect(x, 38, w, 4, TRUCK_COLORS[d.slot].css);
        drawVehicle(s.ctx, d.vehicle, d.slot, ses.style, x + 22, 62, 0, 0, 1.6);
        s.text(d.name, x + 44, 48, '#fff');
        s.text(`$${d.money}`, x + 44, 60, UI.gold);
        rows.forEach((it, k) => {
          const y = 80 + k * step;
          const on = cursor[i] === k && !ready[i];
          if (on) s.rect(x + 3, y - 3, w - 6, it === 'done' ? 14 : 26, '#3a3650');
          const col = on ? UI.gold : UI.text;
          if (it === 'done') {
            s.text(ready[i] ? 'READY' : 'DONE', x + w / 2, y, ready[i] ? UI.good : col, { align: 'center' });
          } else if (it === 'nitro') {
            s.text('NITRO', x + 7, y, col);
            s.text(`x${d.nitro}`, x + w - 7, y, UI.cool, { align: 'right' });
            s.text(`$${ses.catalog.nitroPrice}`, x + 7, y + 12, d.money >= ses.catalog.nitroPrice ? UI.dim : UI.bad);
          } else {
            const cat = cats[k];
            const lvl = d.up[it] ?? 0;
            const max = cat.tiers.length - 1;
            s.text(cat.name, x + 7, y, col);
            for (let p = 0; p < max; p++) s.rect(x + w - 4 - (max - p) * 7, y + 13, 5, 5, p < lvl ? UI.good : '#44405a');
            const price = ses.price(d, it);
            s.text(price < 0 ? 'MAX' : `$${price}`, x + 7, y + 12, price >= 0 && d.money >= price ? UI.dim : UI.bad);
          }
        });
      });
    },
  };
}
