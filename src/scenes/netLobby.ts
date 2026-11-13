import { SLOTS, VIEW_W } from '../core/config';
import { CPU_NAMES, TRUCK_COLORS } from '../content/drivers';
import { ALL_SERIES, modeById, seriesById, trackById, vehicleById } from '../content/registry';
import type { Game, Scene } from '../game/game';
import { drawVehicle } from '../render/sprites';
import { backdrop, dirs, panel, UI } from '../ui/kit';
import { ListMenu } from '../ui/menu';

type Row = 'series' | 'event' | 'vehicle' | 'start' | 'copy' | 'leave';

/** The waiting room of an online game: who is in, what the host has set up, and each player's vehicle. */
export function netLobbyScene(g: Game): Scene {
  const net = g.net;
  const menu = new ListMenu([]);
  let rows: Row[] = [];
  let spin = 0;
  let copied = 0;

  const label = (r: Row): string => {
    const room = net.room!;
    const series = seriesById(room.series);
    if (r === 'series') return `SERIES < ${modeById(series.mode).name} ${series.name} >`;
    if (r === 'event') return `EVENT < ${room.mode === 'champ' ? 'CHAMPIONSHIP' : trackById(series.tracks[room.track]).name} >`;
    if (r === 'vehicle') return `VEHICLE < ${vehicleById(room.vehicles[room.seats.indexOf(room.you)] ?? series.vehicles[0]).name} >`;
    if (r === 'start') return 'START';
    return r === 'copy' ? 'COPY INVITE LINK' : 'LEAVE';
  };

  /** Left/right on a row steps its value; the host's choices go to the server, which tells everyone. */
  const step = (r: Row, d: number) => {
    const room = net.room!;
    const series = seriesById(room.series);
    if (r === 'series') {
      const i = ALL_SERIES.findIndex((k) => k.id === series.id);
      net.send({ t: 'config', series: ALL_SERIES[(i + d + ALL_SERIES.length) % ALL_SERIES.length].id, mode: room.mode, track: 0 });
    } else if (r === 'event') {
      // Championship first, then each track as a single race.
      const n = series.tracks.length + 1;
      const at = room.mode === 'champ' ? 0 : room.track + 1;
      const to = (at + d + n) % n;
      net.send({ t: 'config', series: series.id, mode: to === 0 ? 'champ' : 'quick', track: Math.max(0, to - 1) });
    } else if (r === 'vehicle') {
      const mine = room.vehicles[room.seats.indexOf(room.you)];
      const i = Math.max(0, series.vehicles.indexOf(mine));
      net.send({ t: 'vehicle', id: series.vehicles[(i + d + series.vehicles.length) % series.vehicles.length] });
    }
  };

  return {
    update(dt) {
      spin += dt;
      copied -= dt;
      if (!net.room) return;
      rows = [
        ...(net.isHost ? (['series', 'event'] as Row[]) : []),
        ...(net.watching ? [] : (['vehicle'] as Row[])),
        ...(net.isHost ? (['start'] as Row[]) : []),
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
        const col = TRUCK_COLORS[i];
        const ride = room.vehicles[i] ?? series.vehicles[0];
        panel(s, x, 40, w, 96, who === room.you, col.css);
        s.rect(x, 40, w, 4, col.css);
        s.rect(x + 24, 50, 60, 40, '#b89058');
        s.ctx.imageSmoothingEnabled = style === 'modern';
        drawVehicle(s.ctx, ride, i, style, x + 54, 74, who === null ? -Math.PI / 2 : spin * 2 + i, 0, 1.9);
        s.ctx.imageSmoothingEnabled = false;
        if (who === null) {
          s.text(CPU_NAMES[i], x + w / 2, 98, UI.dim, { align: 'center' });
          s.text('CPU', x + w / 2, 112, UI.faint, { align: 'center' });
        } else {
          s.text(`PLAYER ${++n}`, x + w / 2, 98, '#fff', { align: 'center' });
          const tag = who === room.you ? 'YOU' : who === room.host ? 'HOST' : 'JOINED';
          s.text(tag, x + w / 2, 112, who === room.you ? UI.good : col.css, { align: 'center' });
        }
      }
      menu.draw(g, 60, 148, 15);
      if (net.watching) s.text('ROOM IS FULL - YOU ARE WATCHING', VIEW_W / 2, 238, UI.cool, { align: 'center' });
      else if (!net.isHost) {
        const what = room.mode === 'champ' ? 'CHAMPIONSHIP' : trackById(series.tracks[room.track]).name;
        s.text(`${series.name} - ${what}`, VIEW_W / 2, 226, UI.dim, { align: 'center' });
        s.text('WAITING FOR HOST TO START', VIEW_W / 2, 240, UI.faint, { align: 'center' });
      }
      const link = net.inviteLink().replace(/^https?:\/\//, '');
      s.text(copied > 0 ? 'LINK COPIED' : link, VIEW_W / 2, 256, copied > 0 ? UI.good : UI.cool, { align: 'center', shadow: false });
    },
  };
}
