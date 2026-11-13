import { SLOTS, VIEW_W } from '../core/config';
import { CPU_NAMES, PAINTS } from '../content/drivers';
import { ALL_SERIES, calendar, classById, classesOf, modeById, seriesById, trackById, vehicleById, vehiclesIn } from '../content/registry';
import type { Game, Scene } from '../game/game';
import { drawVehicle } from '../render/sprites';
import { backdrop, dirs, panel, UI } from '../ui/kit';
import { ListMenu } from '../ui/menu';

type Row = 'series' | 'klass' | 'event' | 'vehicle' | 'paint' | 'start' | 'copy' | 'leave';

/** The waiting room of an online game: who is in, what the host has set up, and each player's vehicle and paint. */
export function netLobbyScene(g: Game): Scene {
  const net = g.net;
  const menu = new ListMenu([]);
  let rows: Row[] = [];
  let spin = 0;
  let copied = 0;

  const mySlot = () => net.room!.seats.indexOf(net.room!.you);

  const label = (r: Row): string => {
    const room = net.room!;
    const series = seriesById(room.series);
    if (r === 'series') return `SERIES < ${modeById(series.mode).name} ${series.name} >`;
    if (r === 'klass') return `CLASS < ${classById(room.klass).name} >`;
    if (r === 'event') return `EVENT < ${room.mode === 'champ' ? 'CHAMPIONSHIP' : trackById(calendar(series, room.klass)[room.track]).name} >`;
    if (r === 'vehicle') return `VEHICLE < ${vehicleById(room.vehicles[mySlot()]).name} >`;
    if (r === 'paint') return `PAINT < ${PAINTS[room.paints[mySlot()]].name} >`;
    if (r === 'start') return 'START';
    return r === 'copy' ? 'COPY INVITE LINK' : 'LEAVE';
  };

  /** Left/right on a row steps its value; choices go to the server, which tells everyone. */
  const step = (r: Row, d: number) => {
    const room = net.room!;
    const series = seriesById(room.series);
    const wrap = (i: number, n: number) => (i + d + n) % n;
    if (r === 'series') {
      const i = ALL_SERIES.findIndex((k) => k.id === series.id);
      net.send({ t: 'config', series: ALL_SERIES[wrap(i, ALL_SERIES.length)].id, klass: room.klass, mode: room.mode, track: 0 });
    } else if (r === 'klass') {
      const all = classesOf(series);
      net.send({ t: 'config', series: series.id, klass: all[wrap(Math.max(0, all.indexOf(room.klass)), all.length)], mode: room.mode, track: room.track });
    } else if (r === 'event') {
      // Championship first, then each track as a single race.
      const n = calendar(series, room.klass).length + 1;
      const to = wrap(room.mode === 'champ' ? 0 : room.track + 1, n);
      net.send({ t: 'config', series: series.id, klass: room.klass, mode: to === 0 ? 'champ' : 'quick', track: Math.max(0, to - 1) });
    } else if (r === 'vehicle') {
      const all = vehiclesIn(series, room.klass);
      net.send({ t: 'vehicle', id: all[wrap(Math.max(0, all.indexOf(room.vehicles[mySlot()])), all.length)], paint: room.paints[mySlot()] });
    } else if (r === 'paint') {
      net.send({ t: 'vehicle', id: room.vehicles[mySlot()], paint: wrap(room.paints[mySlot()], PAINTS.length) });
    }
  };

  return {
    update(dt) {
      spin += dt;
      copied -= dt;
      const room = net.room;
      if (!room) return;
      const host = net.isHost;
      const hasClasses = classesOf(seriesById(room.series)).length > 0;
      rows = [
        ...(host ? (['series'] as Row[]) : []),
        ...(host && hasClasses ? (['klass'] as Row[]) : []),
        ...(host ? (['event'] as Row[]) : []),
        ...(net.watching ? [] : (['vehicle', 'paint'] as Row[])),
        ...(host ? (['start'] as Row[]) : []),
        'copy', 'leave',
      ];
      menu.items = rows.map(label);
      menu.sel = Math.min(menu.sel, rows.length - 1);
      const { dx } = dirs(g);
      if (dx) {
        step(rows[menu.sel], dx);
        g.sfx.play('move');
      }
      const pick = menu.nav(g);
      if (pick < 0) return;
      const r = rows[pick];
      if (r === 'start') net.send({ t: 'start' });
      else if (r === 'copy') void navigator.clipboard?.writeText(net.inviteLink()).then(() => (copied = 2.5), () => undefined);
      else if (r === 'leave') {
        net.close();
        g.go('title');
      } else step(r, 1);
    },
    draw() {
      const s = g.screen;
      const room = net.room;
      if (!room) return;
      const series = seriesById(room.series);
      const style = modeById(series.mode).style;
      backdrop(s, `ROOM ${room.code}`, net.isHost ? 'YOU ARE HOST' : '');
      const w = 108;
      let n = 0;
      for (let i = 0; i < SLOTS; i++) {
        const x = 12 + i * (w + 8);
        const who = room.seats[i];
        const col = PAINTS[room.paints[i] ?? i];
        panel(s, x, 38, w, 84, who === room.you, col.css);
        s.rect(x, 38, w, 4, col.css);
        s.rect(x + 24, 46, 60, 36, '#b89058');
        s.ctx.imageSmoothingEnabled = style === 'modern';
        drawVehicle(s.ctx, room.vehicles[i], room.paints[i] ?? i, style, x + 54, 68, who === null ? -Math.PI / 2 : spin * 2 + i, 0, 1.8);
        s.ctx.imageSmoothingEnabled = false;
        if (who === null) {
          s.text(CPU_NAMES[i], x + w / 2, 88, UI.dim, { align: 'center' });
          s.text('CPU', x + w / 2, 102, UI.faint, { align: 'center' });
        } else {
          s.text(`PLAYER ${++n}`, x + w / 2, 88, '#fff', { align: 'center' });
          const tag = who === room.you ? 'YOU' : who === room.host ? 'HOST' : 'JOINED';
          s.text(tag, x + w / 2, 102, who === room.you ? UI.good : col.css, { align: 'center' });
        }
      }
      menu.draw(g, 60, 132, 14);
      if (net.watching) s.text('ROOM IS FULL - YOU ARE WATCHING', 300, 220, UI.cool, { align: 'center' });
      else if (!net.isHost) {
        const what = room.mode === 'champ' ? 'CHAMPIONSHIP' : trackById(calendar(series, room.klass)[room.track]).name;
        const cls = room.klass ? `${classById(room.klass).name} - ` : '';
        s.text(series.name, 340, 196, UI.gold, { align: 'center' });
        s.text(`${cls}${what}`, 340, 210, UI.dim, { align: 'center', size: 6 });
        s.text('WAITING FOR HOST', 340, 226, UI.faint, { align: 'center' });
      }
      const link = net.inviteLink().replace(/^https?:\/\//, '');
      s.text(copied > 0 ? 'LINK COPIED' : link, VIEW_W / 2, 256, copied > 0 ? UI.good : UI.cool, { align: 'center', shadow: false });
    },
  };
}
