import { REMOTE } from '../game/session';
import type { Game } from '../game/game';
import type { ClientMsg, DriverInfo, RaceMsg, RoomMsg, ServerMsg, SnapMsg } from './protocol';

const SERVER = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, '');
const MAX_TRIES = 8;

/** A lasting id for this browser, so the server can hand a dropped player their truck back. */
function playerId(): string {
  const forced = new URLSearchParams(location.search).get('pid');
  if (forced) return forced;
  const fresh = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    let id = localStorage.getItem('mudline.pid');
    if (!id) {
      id = fresh();
      localStorage.setItem('mudline.pid', id);
    }
    return id;
  } catch {
    return fresh();
  }
}

/** The connection to an online room, and the glue that moves this player between screens as the room does. */
export class NetClient {
  room: RoomMsg | null = null;
  error = '';
  ready = false;
  /** True while a dropped connection is being re-established. */
  reconnecting = false;
  onSnap: ((s: SnapMsg) => void) | null = null;
  private ws: WebSocket | null = null;
  private screen = '';
  private code = '';
  private tries = 0;
  private timer = 0;
  private readonly pid = playerId();

  constructor(private g: () => Game) {
    // Regular traffic keeps proxies from closing a quiet lobby.
    setInterval(() => this.send({ t: 'ping' }), 5000);
  }

  /** Web address of the game server, or null when there is none (desktop app without a server set). */
  static base(): string | null {
    if (SERVER) return SERVER;
    return location.protocol.startsWith('http') ? location.origin : null;
  }

  get online(): boolean {
    return this.room !== null;
  }

  get isHost(): boolean {
    return !!this.room && this.room.host === this.room.you;
  }

  /** True when this player has no truck and is only watching. */
  get watching(): boolean {
    return !!this.room && !this.room.seats.includes(this.room.you);
  }

  inviteLink(): string {
    return `${NetClient.base()}/?room=${this.room?.code ?? ''}`;
  }

  create(): void {
    this.code = '';
    this.tries = 0;
    this.open({ t: 'create', pid: this.pid });
  }

  join(code: string): void {
    this.code = code;
    this.tries = 0;
    this.open({ t: 'join', code, pid: this.pid });
  }

  send(m: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  /** Leaves the room for good. */
  close(): void {
    const ws = this.ws;
    window.clearTimeout(this.timer);
    this.ws = null;
    this.room = null;
    this.screen = '';
    this.reconnecting = false;
    ws?.close();
  }

  private open(first: ClientMsg): void {
    const base = NetClient.base();
    if (!base) return;
    const old = this.ws;
    this.ws = null;
    old?.close();
    this.error = '';
    const ws = new WebSocket(base.replace(/^http/, 'ws') + '/ws');
    this.ws = ws;
    ws.onopen = () => this.send(first);
    ws.onmessage = (e) => {
      if (this.ws === ws) this.handle(JSON.parse(String(e.data)) as ServerMsg);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.room = null;
      this.screen = '';
      // A dropped connection is retried by itself; the server keeps this player's truck for them.
      if (this.code && this.tries < MAX_TRIES) {
        this.tries++;
        this.reconnecting = true;
        const code = this.code;
        this.timer = window.setTimeout(() => this.open({ t: 'join', code, pid: this.pid }), 1500);
      } else {
        this.reconnecting = false;
        this.error = this.code ? 'CONNECTION LOST' : 'CANNOT REACH SERVER';
      }
      this.g().go('online');
    };
  }

  private sync(drivers: DriverInfo[]): void {
    const you = this.room?.you;
    const ses = this.g().session;
    ses.drivers = drivers.map((d) => ({
      slot: d.slot, name: d.name, money: d.money, points: d.points, up: d.up, nitro: d.nitro,
      device: d.client === null ? null : d.client === you ? 0 : REMOTE,
    }));
    this.ready = drivers.find((d) => d.client === you)?.ready ?? false;
  }

  private show(name: 'netLobby' | 'netRace' | 'results' | 'shop' | 'champion', arg?: RaceMsg): void {
    if (this.screen === name && name !== 'netRace') return;
    this.screen = name;
    this.g().go(name, arg);
  }

  private handle(m: ServerMsg): void {
    const ses = this.g().session;
    switch (m.t) {
      case 'room':
        this.room = m;
        this.code = m.code;
        this.tries = 0;
        this.reconnecting = false;
        if (m.state === 'lobby') this.show('netLobby');
        break;
      case 'race':
        ses.mode = m.mode;
        ses.round = m.round;
        this.sync(m.drivers);
        this.show('netRace', m);
        break;
      case 'snap':
        this.onSnap?.(m);
        break;
      case 'results':
        this.sync(m.drivers);
        ses.results = m.rows;
        this.show('results');
        break;
      case 'shop':
        this.sync(m.drivers);
        this.show('shop');
        break;
      case 'champion':
        this.sync(m.drivers);
        this.show('champion');
        break;
      case 'error':
        this.close();
        this.error = m.msg;
        this.g().go('online');
        break;
    }
  }
}
