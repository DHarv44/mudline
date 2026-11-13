import { VIEW_W } from '../core/config';
import { backdrop } from '../ui/kit';
import type { Game, Scene } from '../game/game';
import { saveSettings } from '../game/settings';
import { ACTIONS, defaultBinds, KEYBOARD_NAMES, keyLabel } from '../input/bindings';

const HEAD = ['LEFT', 'RIGHT', 'GAS', 'BRAKE', 'NITRO'];
const PAD_ROWS = ['STICK / D-PAD', 'A / RT', 'B / LT', 'X / RB'];

/** Rebind the four keyboard layouts; gamepads use a fixed standard layout shown underneath. */
export function controlsScene(g: Game): Scene {
  const binds = g.settings.binds;
  let row = 0;
  let col = 0;
  let waiting = false;

  return {
    update() {
      if (waiting) return;
      const inp = g.input;
      if (inp.anyHit('back') >= 0) {
        g.sfx.play('back');
        g.go('options');
        return;
      }
      const dy = (inp.anyHit('down') >= 0 ? 1 : 0) - (inp.anyHit('up') >= 0 ? 1 : 0);
      const dx = (inp.anyHit('right') >= 0 ? 1 : 0) - (inp.anyHit('left') >= 0 ? 1 : 0);
      if (dx || dy) {
        row = (row + dy + 5) % 5;
        col = (col + dx + 5) % 5;
        g.sfx.play('move');
      }
      if (inp.anyHit('ok') >= 0) {
        g.sfx.play('ok');
        if (row === 4) {
          defaultBinds().forEach((b, i) => Object.assign(binds[i], b));
          saveSettings(g.settings);
        } else {
          waiting = true;
          inp.capture = (code) => {
            waiting = false;
            if (code !== 'Escape') {
              binds[row][ACTIONS[col]] = code;
              saveSettings(g.settings);
            }
          };
        }
      }
    },
    draw() {
      const s = g.screen;
      backdrop(s, 'CONTROLS');
      HEAD.forEach((h, c) => s.text(h, 122 + c * 72, 42, '#58c8ff', { align: 'center' }));
      for (let r = 0; r < 4; r++) {
        const y = 60 + r * 20;
        s.text(KEYBOARD_NAMES[r], 12, y, '#9a9aa8');
        ACTIONS.forEach((a, c) => {
          const on = r === row && c === col;
          if (on) s.rect(88 + c * 72, y - 4, 68, 15, '#3a3650');
          const label = on && waiting ? (s.blink(0.5) ? 'PRESS' : '') : keyLabel(binds[r][a]);
          s.text(label, 122 + c * 72, y, on ? '#ffd84a' : '#d8d8e0', { align: 'center' });
        });
      }
      s.text('RESET KEYS', 12, 142, row === 4 ? '#ffd84a' : '#d8d8e0');
      s.rect(12, 164, VIEW_W - 24, 1, '#44405a');
      s.text('GAMEPAD', 12, 174, '#58c8ff');
      ['STEER', 'GAS', 'BRAKE', 'NITRO'].forEach((n, i) => {
        s.text(n, 30, 192 + i * 16, '#9a9aa8');
        s.text(PAD_ROWS[i], 110, 192 + i * 16, '#d8d8e0');
      });
      s.text('START', 290, 192, '#9a9aa8');
      s.text('PAUSE', 370, 192, '#d8d8e0');
    },
  };
}
