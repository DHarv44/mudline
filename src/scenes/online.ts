import { VIEW_W } from '../core/config';
import type { Game, Scene } from '../game/game';
import { NetClient } from '../net/client';
import { CODE_LEN, CODE_LETTERS } from '../net/protocol';
import { ListMenu } from '../ui/menu';

/** Create an online room, or join one by code. Opening an invite link lands here with the code filled in. */
export function onlineScene(g: Game, invite?: string): Scene {
  const net = g.net;
  const menu = new ListMenu(['CREATE ROOM', 'JOIN WITH CODE', 'BACK']);
  const can = NetClient.base() !== null;
  let mode: 'menu' | 'code' | 'invite' | 'busy' = invite ? 'invite' : 'menu';
  let code = (invite ?? '').toUpperCase().slice(0, CODE_LEN);

  const join = () => {
    mode = 'busy';
    net.join(code);
  };

  const typeCode = () => {
    g.input.capture = (key) => {
      if (mode !== 'code') return;
      if (key === 'Escape') {
        mode = 'menu';
        return;
      }
      if (key === 'Backspace') code = code.slice(0, -1);
      else if ((key === 'Enter' || key === 'NumpadEnter') && code.length === CODE_LEN) {
        join();
        return;
      } else if (key.startsWith('Key') && CODE_LETTERS.includes(key[3]) && code.length < CODE_LEN) code += key[3];
      typeCode();
    };
  };

  return {
    update() {
      const back = g.input.anyHit('back') >= 0;
      if (net.reconnecting) {
        if (back) net.close();
        return;
      }
      // A failed attempt drops back to the menu, where the reason is shown.
      if (mode === 'busy' && net.error) mode = 'menu';
      if (mode === 'busy' || mode === 'code') return;
      if (mode === 'invite') {
        if ((g.input.anyHit('gas') >= 0 || g.input.anyHit('ok') >= 0 || g.screen.mouse.click) && can) {
          g.sfx.play('ok');
          join();
        } else if (back) {
          mode = 'menu';
        }
        return;
      }
      if (back) {
        g.sfx.play('back');
        g.go('title');
        return;
      }
      const pick = menu.nav(g);
      if (pick === 2) g.go('title');
      if (!can || pick < 0) return;
      if (pick === 0) {
        mode = 'busy';
        net.create();
      } else if (pick === 1) {
        net.error = '';
        code = '';
        mode = 'code';
        typeCode();
      }
    },
    draw() {
      const s = g.screen;
      const cx = VIEW_W / 2;
      s.rect(0, 0, VIEW_W, 270, '#14121c');
      s.text('ONLINE', cx, 20, '#ffb020', { align: 'center', size: 16 });
      if (net.reconnecting) {
        s.text('CONNECTION LOST', cx, 100, '#ff8048', { align: 'center' });
        if (s.blink()) s.text('RECONNECTING', cx, 124, '#d8d8e0', { align: 'center' });
        return;
      }
      if (!can) {
        s.text('ONLINE PLAY RUNS FROM THE WEB VERSION', cx, 70, '#ff8048', { align: 'center' });
      } else if (net.error) {
        s.text(net.error, cx, 70, '#ff8048', { align: 'center' });
      }
      if (mode === 'menu') {
        menu.draw(g, cx, 110, 22, 'center');
      } else if (mode === 'busy') {
        s.text('CONNECTING', cx, 120, '#d8d8e0', { align: 'center' });
      } else {
        s.text('ROOM', cx, 100, '#9a9aa8', { align: 'center' });
        for (let i = 0; i < CODE_LEN; i++) {
          const x = cx - 62 + i * 32;
          s.rect(x, 118, 28, 30, '#22202e');
          s.rect(x, 146, 28, 2, i === code.length && mode === 'code' && s.blink(0.6) ? '#ffd84a' : '#44405a');
          if (code[i]) s.text(code[i], x + 14, 125, '#fff', { align: 'center', size: 16 });
        }
        if (mode === 'invite' && s.blink()) s.text('PRESS GAS TO JOIN', cx, 176, '#ffd84a', { align: 'center' });
      }
    },
    leave() {
      g.input.capture = null;
    },
  };
}
