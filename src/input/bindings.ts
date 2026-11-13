export type Action = 'left' | 'right' | 'gas' | 'brake' | 'nitro';
export const ACTIONS: Action[] = ['left', 'right', 'gas', 'brake', 'nitro'];
export type KeyBinds = Record<Action, string>;

export const KEYBOARD_NAMES = ['ARROWS', 'WASD', 'IJKL', 'NUMPAD'];

export function defaultBinds(): KeyBinds[] {
  return [
    { left: 'ArrowLeft', right: 'ArrowRight', gas: 'ArrowUp', brake: 'ArrowDown', nitro: 'ShiftRight' },
    { left: 'KeyA', right: 'KeyD', gas: 'KeyW', brake: 'KeyS', nitro: 'ShiftLeft' },
    { left: 'KeyJ', right: 'KeyL', gas: 'KeyI', brake: 'KeyK', nitro: 'KeyH' },
    { left: 'Numpad4', right: 'Numpad6', gas: 'Numpad8', brake: 'Numpad5', nitro: 'Numpad0' },
  ];
}

export function keyLabel(code: string): string {
  return code
    .replace('Arrow', '')
    .replace('Key', '')
    .replace('Digit', '')
    .replace('Numpad', 'NUM')
    .replace('ShiftRight', 'R SHIFT')
    .replace('ShiftLeft', 'L SHIFT')
    .replace('ControlRight', 'R CTRL')
    .replace('ControlLeft', 'L CTRL')
    .toUpperCase()
    .slice(0, 8);
}
