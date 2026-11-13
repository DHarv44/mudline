import { defaultBinds, KeyBinds } from '../input/bindings';

export interface Settings {
  volume: number;
  engines: boolean;
  crt: boolean;
  binds: KeyBinds[];
}

const KEY = 'mudline.settings';

export function loadSettings(): Settings {
  const s: Settings = { volume: 6, engines: true, crt: true, binds: defaultBinds() };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw) as Partial<Settings>;
      if (typeof o.volume === 'number') s.volume = o.volume;
      if (typeof o.engines === 'boolean') s.engines = o.engines;
      if (typeof o.crt === 'boolean') s.crt = o.crt;
      if (Array.isArray(o.binds) && o.binds.length === 4) s.binds = o.binds.map((b, i) => ({ ...s.binds[i], ...b }));
    }
  } catch {
    // Stored settings unreadable: keep defaults.
  }
  return s;
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable: settings last for this session only.
  }
}
