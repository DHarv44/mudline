import { SLOTS, VIEW_W } from '../core/config';
import { TRACKS } from '../content/tracks';
import { CPU_NAMES, TRUCK_COLORS } from '../content/trucks';
import type { Game, Scene } from '../game/game';
import { drawTruck } from '../render/truckSprites';
import { ListMenu } from '../ui/menu';

/** The waiting room of an online game: who is in, the invite link, and the host's start buttons. */
export function netLobbyScene(g: Game): Scene {
  const net = g.net;
  const menu = new ListMenu([]);
  let track = 0;
  let spin = 0;
  let copied = 0;

  const items = (): string[] =>
    net.isHost
      ? ['START CHAMPIONSHIP', `QUICK RACE < ${TRACKS[track].name} >`, 'COPY INVITE LINK', 'LEAVE']
      : ['COPY INVITE LINK', 'LEAVE'];

  return {
    update(dt) {
      spin += dt;
      copied -= dt;
      menu.items = items();
      menu.sel = Math.min(menu.sel, menu.items.length - 1);
      const host = net.isHost;
      if (host && menu.sel === 1) {
        const d = (g.input.anyHit('right') >= 0 ? 1 : 0) - (g.input.anyHit('left') >= 0 ? 1 : 0);
        if (d) {
          track = (track + d + TRACKS.length) % TRACKS.length;
          g.sfx.play('move');
        }
      }
      const pick = menu.nav(g);
      if (pick < 0) return;
      const what = menu.items[pick];
      if (what.startsWith('START')) net.send({ t: 'start', mode: 'champ', track: 0 });
      else if (what.startsWith('QUICK')) net.send({ t: 'start', mode: 'quick', track });
      else if (what.startsWith('COPY')) {
        void navigator.clipboard?.writeText(net.inviteLink()).then(() => (copied = 2.5), () => undefined);
      } else {
        net.close();
        g.go('title');
      }
    },
    draw() {
      const s = g.screen;
      const room = net.room;
      s.rect(0, 0, VIEW_W, 270, '#14121c');
      if (!room) return;
      s.text(`ROOM ${room.code}`, VIEW_W / 2, 12, '#ffb020', { align: 'center', size: 16 });
      const w = 108;
      let n = 0;
      for (let i = 0; i < SLOTS; i++) {
        const x = 12 + i * (w + 8);
        const who = room.seats[i];
        s.rect(x, 38, w, 100, '#22202e');
        s.rect(x, 38, w, 4, TRUCK_COLORS[i].css);
        s.rect(x + 24, 50, 60, 44, '#c89c5e');
        drawTruck(s.ctx, i, x + 54, 78, who === null ? -Math.PI / 2 : spin * 2 + i, 0, 2);
        if (who === null) {
          s.text(CPU_NAMES[i], x + w / 2, 104, '#8a8a98', { align: 'center' });
          s.text('CPU', x + w / 2, 118, '#5c5c6a', { align: 'center' });
        } else {
          s.text(`PLAYER ${++n}`, x + w / 2, 104, '#fff', { align: 'center' });
          const tag = who === room.you ? 'YOU' : who === room.host ? 'HOST' : 'JOINED';
          s.text(tag, x + w / 2, 118, who === room.you ? '#58e070' : TRUCK_COLORS[i].css, { align: 'center' });
        }
      }
      menu.draw(g, 110, 156, 18);
      if (!net.isHost) s.text('WAITING FOR HOST TO START', VIEW_W / 2, 204, '#9a9aa8', { align: 'center' });
      const link = net.inviteLink().replace(/^https?:\/\//, '');
      s.text(copied > 0 ? 'LINK COPIED' : link, VIEW_W / 2, 246, copied > 0 ? '#58e070' : '#58c8ff', { align: 'center' });
    },
  };
}
