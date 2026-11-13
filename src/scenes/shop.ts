import { VIEW_W } from '../core/config';
import { mulberry32 } from '../core/rng';
import { MAX_LEVEL, NITRO_PRICE, TRUCK_COLORS, UpgradeId, upgradePrice, UPGRADES } from '../content/trucks';
import type { Game, Scene } from '../game/game';
import { drawTruck } from '../render/truckSprites';

type Item = UpgradeId | 'nitro' | 'done';
const ITEMS: Item[] = [...UPGRADES.map((u) => u.id), 'nitro', 'done'];

/** Between championship rounds every player spends winnings at once, each in their own column. */
export function shopScene(g: Game): Scene {
  const ses = g.session;
  const net = g.net;
  const online = net.online;
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
        if (ready[i]) {
          if (g.input.hit(dev, 'back')) {
            if (online) net.send({ t: 'ready', v: false });
            else ready[i] = false;
          }
          return;
        }
        if (g.input.hit(dev, 'up')) {
          cursor[i] = (cursor[i] + ITEMS.length - 1) % ITEMS.length;
          g.sfx.play('move');
        }
        if (g.input.hit(dev, 'down')) {
          cursor[i] = (cursor[i] + 1) % ITEMS.length;
          g.sfx.play('move');
        }
        if (g.input.hit(dev, 'ok')) {
          const it = ITEMS[cursor[i]];
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
      s.rect(0, 0, VIEW_W, 270, '#14121c');
      s.text('PIT SHOP', VIEW_W / 2, 10, '#ffb020', { align: 'center', size: 16 });
      const w = 112;
      const x0 = (VIEW_W - humans.length * (w + 6) + 6) / 2;
      humans.forEach((d, i) => {
        const x = x0 + i * (w + 6);
        s.rect(x, 34, w, 228, '#22202e');
        s.rect(x, 34, w, 4, TRUCK_COLORS[d.slot].css);
        drawTruck(s.ctx, d.slot, x + 22, 58, 0, 0, 2);
        s.text(d.name, x + 44, 44, '#fff');
        s.text(`$${d.money}`, x + 44, 56, '#ffd84a');
        ITEMS.forEach((it, k) => {
          const y = 76 + k * 30;
          const on = cursor[i] === k && !ready[i];
          if (on) s.rect(x + 3, y - 3, w - 6, it === 'done' ? 14 : 26, '#3a3650');
          const col = on ? '#ffd84a' : '#d8d8e0';
          if (it === 'done') {
            s.text(ready[i] ? 'READY' : 'DONE', x + w / 2, y, ready[i] ? '#58e070' : col, { align: 'center' });
          } else if (it === 'nitro') {
            s.text('NITRO', x + 7, y, col);
            s.text(`x${d.nitro}`, x + w - 7, y, '#58c8ff', { align: 'right' });
            s.text(`$${NITRO_PRICE}`, x + 7, y + 12, d.money >= NITRO_PRICE ? '#9a9aa8' : '#a04848');
          } else {
            const lvl = d.up[it];
            s.text(UPGRADES.find((u) => u.id === it)!.name, x + 7, y, col);
            for (let p = 0; p < MAX_LEVEL; p++) s.rect(x + w - 39 + p * 7, y + 13, 5, 5, p < lvl ? '#58e070' : '#44405a');
            const price = upgradePrice(lvl);
            s.text(lvl >= MAX_LEVEL ? 'MAX' : `$${price}`, x + 7, y + 12, lvl < MAX_LEVEL && d.money >= price ? '#9a9aa8' : '#a04848');
          }
        });
      });
    },
  };
}
