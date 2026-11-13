import { KEYBOARD_NAMES, KeyBinds } from './bindings';

export interface DevState {
  steer: number;
  gas: boolean; brake: boolean; nitro: boolean;
  up: boolean; down: boolean; left: boolean; right: boolean;
  ok: boolean; back: boolean; start: boolean;
}

export type Button = Exclude<keyof DevState, 'steer'>;

function blank(): DevState {
  return { steer: 0, gas: false, brake: false, nitro: false, up: false, down: false, left: false, right: false, ok: false, back: false, start: false };
}

/** Devices 0-3 are the keyboard layouts, 4-7 are gamepads. */
export const DEVICES = 8;
const DEAD = 0.25;

export class InputHub {
  cur: DevState[] = [];
  prev: DevState[] = [];
  private keys = new Set<string>();
  private all = blank();
  /** Browser gamepad index held by each of the four PAD slots, or -1. */
  private padIndex = [-1, -1, -1, -1];
  /** When set, the next key press is handed here instead of being treated as input. */
  capture: ((code: string) => void) | null = null;
  onGesture: (() => void) | null = null;

  constructor(public binds: KeyBinds[]) {
    for (let i = 0; i < DEVICES; i++) {
      this.cur.push(blank());
      this.prev.push(blank());
    }
    window.addEventListener('keydown', (e) => {
      this.onGesture?.();
      if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Tab' || e.code === 'Backspace') e.preventDefault();
      if (this.capture) {
        const c = this.capture;
        this.capture = null;
        c(e.code);
        return;
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  poll(): void {
    const tmp = this.prev;
    this.prev = this.cur;
    this.cur = tmp;
    const k = this.keys;
    for (let i = 0; i < 4; i++) {
      const b = this.binds[i];
      const s = this.cur[i];
      s.left = k.has(b.left);
      s.right = k.has(b.right);
      s.gas = s.up = k.has(b.gas);
      s.brake = s.down = k.has(b.brake);
      s.nitro = k.has(b.nitro);
      s.steer = (s.right ? 1 : 0) - (s.left ? 1 : 0);
      s.ok = s.nitro || (i === 0 && (k.has('Enter') || k.has('Space')));
      s.back = i === 0 && (k.has('Escape') || k.has('Backspace'));
      s.start = i === 0 && k.has('Escape');
    }
    // Only standard-layout pads: wheels, flight sticks and pedals rest off-centre and would steer the menus.
    // The browser may list a pad after several such devices, so pads are found anywhere in its list
    // and each keeps the first free PAD slot for as long as it stays connected.
    const all = navigator.getGamepads ? navigator.getGamepads() : [];
    const live = new Map<number, Gamepad>();
    for (const p of all) if (p && p.connected && p.mapping === 'standard') live.set(p.index, p);
    for (let i = 0; i < 4; i++) if (this.padIndex[i] >= 0 && !live.has(this.padIndex[i])) this.padIndex[i] = -1;
    for (const idx of live.keys()) {
      if (this.padIndex.includes(idx)) continue;
      const free = this.padIndex.indexOf(-1);
      if (free >= 0) this.padIndex[free] = idx;
    }
    for (let i = 0; i < 4; i++) {
      const s = this.cur[4 + i];
      const p = live.get(this.padIndex[i]);
      if (!p) {
        Object.assign(s, blank());
        continue;
      }
      const btn = (n: number) => !!p.buttons[n] && (p.buttons[n].pressed || p.buttons[n].value > 0.3);
      const ax = p.axes[0] ?? 0;
      const ay = p.axes[1] ?? 0;
      s.left = btn(14) || ax < -0.5;
      s.right = btn(15) || ax > 0.5;
      s.up = btn(12) || ay < -0.5;
      s.down = btn(13) || ay > 0.5;
      s.steer = btn(14) ? -1 : btn(15) ? 1 : Math.abs(ax) > DEAD ? (ax - Math.sign(ax) * DEAD) / (1 - DEAD) : 0;
      s.gas = btn(0) || btn(7);
      s.brake = btn(1) || btn(6);
      s.nitro = btn(2) || btn(5);
      s.ok = btn(0);
      s.back = btn(1);
      s.start = btn(9);
    }
  }

  /** Every device combined, for online play where one browser is one player on any keys or pad. */
  merged(): DevState {
    const m = this.all;
    Object.assign(m, blank());
    for (const s of this.cur) {
      m.steer += s.steer;
      m.gas ||= s.gas;
      m.brake ||= s.brake;
      m.nitro ||= s.nitro;
    }
    m.steer = Math.max(-1, Math.min(1, m.steer));
    return m;
  }

  hit(dev: number, b: Button): boolean {
    return this.cur[dev][b] && !this.prev[dev][b];
  }

  /** The first device that just pressed the button, or -1. */
  anyHit(b: Button): number {
    for (let i = 0; i < DEVICES; i++) if (this.hit(i, b)) return i;
    return -1;
  }

  label(dev: number): string {
    return dev < 4 ? KEYBOARD_NAMES[dev] : `PAD ${dev - 3}`;
  }
}
