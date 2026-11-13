import { mulberry32 } from '../core/rng';
import { TRUCK_COLORS } from '../content/drivers';
import { statsFor, vehicleById } from '../content/registry';
import type { Stats } from '../content/types';
import type { Game, Scene } from '../game/game';
import { drawBay, drawSide, partLook } from '../render/garageArt';
import { inBox, panel, statBar, UI } from '../ui/kit';

/** What each meter shows and the value that fills it. */
const METERS: { label: string; of: (s: Stats) => number }[] = [
  { label: 'SPEED', of: (s) => s.top / 160 },
  { label: 'POWER', of: (s) => s.accel / 180 },
  { label: 'GRIP', of: (s) => s.grip / 8.5 },
  { label: 'HANDLING', of: (s) => s.turn / 5.2 },
  { label: 'LANDING', of: (s) => (s.land - 0.7) / 0.3 },
  { label: 'NITRO', of: (s) => (s.boost * s.boostTime - 1.3) / 1.7 },
];

/**
 * The garage between rounds: the vehicle on the lift with its parts showing, the parts wall on the right.
 * Players sharing a screen take the bay one after another.
 */
export function garageScene(g: Game): Scene {
  const ses = g.session;
  const net = g.net;
  const online = net.online;
  const cats = ses.catalog.categories;
  const rows = [...cats.map((c) => c.id), 'nitro', 'done'];
  const rowH = Math.min(24, 200 / rows.length);
  const rowY = (i: number) => 40 + i * rowH;
  let who = 0;
  let sel = 0;
  let time = 0;

  const leave = () => {
    ses.aiShop(mulberry32(Date.now() & 0xffff));
    ses.round++;
    g.go('race');
  };

  const act = (d: (typeof ses.drivers)[number]) => {
    const it = rows[sel];
    if (it === 'done') {
      g.sfx.play('ok');
      if (online) net.send({ t: 'ready', v: true });
      else if (++who >= ses.locals.length) leave();
      else sel = 0;
    } else if (online) {
      net.send({ t: 'buy', item: it });
      g.sfx.play('buy');
    } else {
      g.sfx.play(ses.buy(d, it) ? 'buy' : 'deny');
    }
  };

  return {
    update(dt) {
      time += dt;
      const d = ses.locals[Math.min(who, ses.locals.length - 1)];
      if (!d) return;
      const dev = d.device!;
      const hit = (b: 'up' | 'down' | 'ok' | 'back') => (online ? g.input.anyHit(b) >= 0 : g.input.hit(dev, b));
      if (online && net.ready) {
        if (hit('back')) net.send({ t: 'ready', v: false });
        return;
      }
      const before = sel;
      if (hit('up')) sel = (sel + rows.length - 1) % rows.length;
      if (hit('down')) sel = (sel + 1) % rows.length;
      const m = g.screen.mouse;
      if (m.moved || m.click) {
        for (let i = 0; i < rows.length; i++) {
          if (!inBox(g, 286, rowY(i), 184, rowH - 2)) continue;
          sel = i;
          if (m.click) {
            act(d);
            return;
          }
        }
      }
      if (sel !== before) g.sfx.play('move');
      if (hit('ok')) act(d);
    },
    draw() {
      const s = g.screen;
      drawBay(s, time);
      const d = ses.locals[Math.min(who, ses.locals.length - 1)];
      if (!d) {
        s.text('WATCHING - YOU RACE NEXT', 140, 120, UI.cool, { align: 'center' });
        return;
      }
      const v = vehicleById(d.vehicle);
      const col = TRUCK_COLORS[d.slot];
      drawSide(s, v, col.rgb, partLook(ses.catalog, d.up), d.nitro);

      // The name hangs as a shop sign in front of the lamp cable.
      s.rect(8, 4, Math.max(v.name.length * 16, 190) + 12, 38, '#0c0b12');
      s.rect(8, 42, Math.max(v.name.length * 16, 190) + 12, 2, UI.amber);
      s.text(v.name, 14, 10, UI.amber, { size: 16 });
      s.text(`${d.name}  ROUND ${ses.round + 2} NEXT`, 14, 30, UI.dim, { shadow: false });

      // Meters show what the highlighted part would add, in green.
      const now = statsFor(v, ses.catalog, d.up);
      const it = rows[sel];
      const canUp = it !== 'nitro' && it !== 'done' && ses.price(d, it) >= 0;
      const next = canUp ? statsFor(v, ses.catalog, { ...d.up, [it]: (d.up[it] ?? 0) + 1 }) : now;
      panel(s, 10, 208, 264, 56);
      METERS.forEach((mtr, i) => {
        statBar(s, mtr.label, 18 + (i % 2) * 130, 214 + Math.floor(i / 2) * 16, 118, mtr.of(now), mtr.of(next));
      });

      panel(s, 282, 6, 192, 258, false);
      s.rect(282, 6, 192, 3, col.css);
      s.text(`$${d.money}`, 466, 16, UI.gold, { align: 'right', size: 16 });
      s.text('PARTS', 290, 20, UI.dim, { shadow: false });
      const ready = online && net.ready;
      rows.forEach((id, i) => {
        const y = rowY(i);
        const on = sel === i && !ready;
        if (on) s.rect(286, y, 184, rowH - 2, '#3a3650');
        const ink = on ? UI.gold : UI.text;
        if (id === 'done') {
          s.text(ready ? 'READY' : 'BACK TO THE TRACK', 378, y + rowH / 2 - 5, ready ? UI.good : ink, { align: 'center' });
        } else if (id === 'nitro') {
          s.text('NITRO BOTTLE', 291, y + 2, ink);
          s.text(`x${d.nitro}`, 466, y + 2, UI.cool, { align: 'right' });
          s.text(`$${ses.catalog.nitroPrice}`, 291, y + 12, d.money >= ses.catalog.nitroPrice ? UI.dim : UI.bad, { shadow: false });
        } else {
          const cat = cats[i];
          const lvl = d.up[id] ?? 0;
          const max = cat.tiers.length - 1;
          s.text(cat.name, 291, y + 2, ink);
          for (let p = 0; p < max; p++) s.rect(466 - (max - p) * 7, y + 3, 5, 5, p < lvl ? UI.good : '#44405a');
          const price = ses.price(d, id);
          if (price < 0) {
            s.text(`${cat.tiers[lvl].name}  FITTED`, 291, y + 12, UI.faint, { shadow: false });
          } else {
            s.text(cat.tiers[lvl + 1].name, 291, y + 12, d.money >= price ? UI.dim : UI.bad, { shadow: false });
            s.text(`$${price}`, 466, y + 12, d.money >= price ? UI.dim : UI.bad, { align: 'right', shadow: false });
          }
        }
      });
    },
  };
}
