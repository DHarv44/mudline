import { PAINTS } from '../content/drivers';
import { classById, statsFor, trackById, vehicleById } from '../content/registry';
import type { Stats } from '../content/types';
import type { Game, Scene } from '../game/game';
import { Driver, Session } from '../game/session';
import { drawBay, drawSide, partLook } from '../render/garageArt';
import { PLACE } from '../render/hud';
import { drawPaint, drawRows, drawSchedule, drawStandings, PAINT_COLS, paintBox, rowHeight, WALL, WallRow } from '../ui/garagePanels';
import { dirs, inBox, panel, statBar, UI } from '../ui/kit';

/** What each meter shows and the value that fills it. */
const METERS: { label: string; of: (s: Stats) => number }[] = [
  { label: 'SPEED', of: (s) => s.top / 160 },
  { label: 'POWER', of: (s) => s.accel / 180 },
  { label: 'GRIP', of: (s) => s.grip / 8.5 },
  { label: 'HANDLING', of: (s) => s.turn / 5.2 },
  { label: 'LANDING', of: (s) => (s.land - 0.7) / 0.3 },
  { label: 'NITRO', of: (s) => (s.boost * s.boostTime - 1.3) / 1.7 },
];

type View = 'board' | 'parts' | 'paint' | 'schedule' | 'standings';
type Action = 'race' | 'ready' | 'parts' | 'paint' | 'schedule' | 'standings' | 'new';

/**
 * The garage: home base of a championship. Your vehicle stands on the lift; the wall beside it is the
 * board for the next race, parts, paint, the calendar and the standings. Online it is the same room
 * between rounds, with READY in place of RACE.
 */
export function garageScene(g: Game): Scene {
  const ses = g.session;
  const net = g.net;
  const online = net.online;
  const cats = ses.catalog.categories;
  const partIds = [...cats.map((c) => c.id), 'nitro', 'back'];
  const actions: Action[] = online ? ['ready', 'parts', 'schedule', 'standings'] : ['race', 'parts', 'paint', 'schedule', 'standings', 'new'];
  let view: View = 'board';
  let sel = 0;
  let time = 0;

  const me = (): Driver | undefined => ses.locals[0];
  /** The round about to be run. Online the server only moves on when the race starts. */
  const nextRound = () => (online ? (net.room?.round ?? 0) + 1 : ses.round);

  const open = (v: View, at = 0) => {
    view = v;
    sel = at;
  };

  const boardRows = (d: Driver): WallRow[] =>
    actions.map((a): WallRow => {
      const n = nextRound();
      if (a === 'race') return { label: 'RACE', sub: `ROUND ${n + 1} - ${trackById(ses.order[n]).name}`, ink: UI.good };
      if (a === 'ready') return net.ready ? { label: 'READY', sub: 'WAITING FOR THE OTHERS', ink: UI.good } : { label: 'READY UP', sub: `ROUND ${n + 1} - ${trackById(ses.order[n]).name}` };
      if (a === 'parts') return { label: 'PARTS', sub: `$${d.money} TO SPEND` };
      if (a === 'paint') return { label: 'PAINT', sub: PAINTS[d.color].name };
      if (a === 'schedule') return { label: 'SCHEDULE', sub: `${n} OF ${ses.order.length} RUN` };
      if (a === 'standings') return { label: 'STANDINGS', sub: `${PLACE[ses.standings().indexOf(d)]} - ${d.points} PTS` };
      return { label: 'NEW SEASON', sub: 'LEAVE THIS CHAMPIONSHIP' };
    });

  const partRows = (d: Driver): WallRow[] =>
    partIds.map((id, i): WallRow => {
      if (id === 'back') return { label: 'BACK' };
      if (id === 'nitro') return { label: 'NITRO BOTTLE', sub: `$${ses.catalog.nitroPrice}`, right: `x${d.nitro}`, bad: d.money < ses.catalog.nitroPrice };
      const cat = cats[i];
      const lvl = d.up[id] ?? 0;
      const price = ses.price(d, id);
      const pips = `${lvl}/${cat.tiers.length - 1}`;
      if (price < 0) return { label: cat.name, sub: `${cat.tiers[lvl].name} FITTED`, right: pips };
      return { label: cat.name, sub: `${cat.tiers[lvl + 1].name}  $${price}`, right: pips, bad: d.money < price };
    });

  const act = (d: Driver) => {
    if (view === 'board') {
      const a = actions[sel];
      g.sfx.play('ok');
      if (a === 'race') g.go('race');
      else if (a === 'ready') net.send({ t: 'ready', v: !net.ready });
      else if (a === 'new') {
        Session.clearSave();
        g.go('season', ses.series.mode);
      } else open(a, a === 'paint' ? d.color : 0);
    } else if (view === 'parts') {
      const id = partIds[sel];
      if (id === 'back') open('board', actions.indexOf('parts'));
      else if (online) {
        net.send({ t: 'buy', item: id });
        g.sfx.play('buy');
      } else {
        g.sfx.play(ses.buy(d, id) ? 'buy' : 'deny');
        ses.save();
      }
    } else if (view === 'paint') {
      ses.paint(d, sel);
      ses.save();
      g.sfx.play('buy');
      open('board', actions.indexOf('paint'));
    } else {
      open('board', actions.indexOf(view));
    }
  };

  return {
    update(dt) {
      time += dt;
      const d = me();
      if (!d) return;
      if (g.input.anyHit('back') >= 0) {
        g.sfx.play('back');
        if (view !== 'board') open('board', Math.max(0, actions.indexOf(view as Action)));
        else if (!online) g.go('title');
        return;
      }
      // Parts are locked in once an online player has readied up.
      if (online && net.ready && view !== 'board') open('board');
      const { dx, dy } = dirs(g);
      const before = sel;
      const m = g.screen.mouse;
      let clicked = false;
      if (view === 'paint') {
        sel = (sel + dx + dy * PAINT_COLS + PAINTS.length) % PAINTS.length;
        if (m.moved || m.click) {
          PAINTS.forEach((_, i) => {
            const b = paintBox(i);
            if (inBox(g, b.x, b.y, b.w, b.h)) {
              sel = i;
              clicked = m.click;
            }
          });
        }
      } else if (view === 'board' || view === 'parts') {
        const n = view === 'board' ? actions.length : partIds.length;
        const h = rowHeight(n);
        sel = (sel + dy + n) % n;
        if (m.moved || m.click) {
          for (let i = 0; i < n; i++) {
            if (inBox(g, WALL.x, WALL.y + i * h, WALL.w, h - 2)) {
              sel = i;
              clicked = m.click;
            }
          }
        }
      } else if (m.click) {
        clicked = true;
      }
      if (sel !== before) g.sfx.play('move');
      if (clicked || g.input.anyHit('ok') >= 0) act(d);
    },
    draw() {
      const s = g.screen;
      drawBay(s, time);
      const d = me();
      if (!d) {
        s.text('WATCHING - YOU RACE NEXT', 140, 120, UI.cool, { align: 'center' });
        return;
      }
      const v = vehicleById(d.vehicle);
      // The paint under the cursor is previewed on the vehicle before it is chosen.
      const paint = PAINTS[view === 'paint' ? sel : d.color];
      drawSide(s, v, paint.rgb, partLook(ses.catalog, d.up), d.nitro);

      // The name hangs as a shop sign in front of the lamp cable.
      const signW = Math.max(v.name.length * 16, 190) + 12;
      s.rect(8, 4, signW, 38, '#0c0b12');
      s.rect(8, 42, signW, 2, UI.amber);
      s.text(v.name, 14, 10, UI.amber, { size: 16 });
      const cls = ses.klass ? classById(ses.klass).name : '';
      s.text(`${ses.series.name}  ${cls}`, 14, 30, UI.dim, { shadow: false, size: 6 });

      // Meters show what the highlighted part would add, in green.
      const now = statsFor(v, ses.catalog, d.up);
      const id = view === 'parts' ? partIds[sel] : '';
      const canUp = id !== '' && id !== 'nitro' && id !== 'back' && ses.price(d, id) >= 0;
      const next = canUp ? statsFor(v, ses.catalog, { ...d.up, [id]: (d.up[id] ?? 0) + 1 }) : now;
      panel(s, 10, 208, 264, 56);
      METERS.forEach((mtr, i) => {
        statBar(s, mtr.label, 18 + (i % 2) * 130, 214 + Math.floor(i / 2) * 16, 118, mtr.of(now), mtr.of(next));
      });

      panel(s, 282, 6, 192, 258, false);
      s.rect(282, 6, 192, 3, paint.css);
      s.text(d.name, 290, 18, UI.dim, { shadow: false });
      s.text(`$${d.money}`, 466, 14, UI.gold, { align: 'right', size: 16 });
      if (view === 'board') drawRows(g, boardRows(d), sel);
      else if (view === 'parts') drawRows(g, partRows(d), sel);
      else if (view === 'paint') drawPaint(g, sel, d.color);
      else if (view === 'schedule') drawSchedule(g, d.slot, nextRound());
      else drawStandings(g, d);
    },
  };
}
