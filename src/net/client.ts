import { REMOTE } from '../game/session';
import type { Game } from '../game/game';
import type { ClientMsg, DriverInfo, RaceMsg, RoomMsg, ServerMsg, SnapMsg } from './protocol';

const SERVER = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, '');

/** The connection to an online room, and the glue that moves this player between screens as the room does. */
export class NetClient {
  room: RoomMsg | null = null;
  /** The input device this player drives with. */
  device = 0;
  error = '';
  ready = false;
  onSnap: ((s: SnapMsg) => void) | null = null;
  private ws: WebSocket | null = null;
  private screen = '';

  constructor(private g: () => Game) {}

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

  inviteLink(): string {
    return `${NetClient.base()}/?room=${this.room?.code ?? ''}`;
  }

  connect(first: ClientMsg): void {
    const base = NetClient.base();
    if (!base) return;
    this.close();
    this.error = '';
    const ws = new WebSocket(base.replace(/^http/, 'ws') + '/ws');
    this.ws = ws;
    ws.onopen = () => this.send(first);
    ws.onmessage = (e) => {
      if (this.ws === ws) this.handle(JSON.parse(String(e.data)) as ServerMsg);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      const was = this.room !== null;
      this.ws = null;
      this.room = null;
      this.screen = '';
      if (!this.error) this.error = was ? 'CONNECTION LOST' : 'CANNOT REACH SERVER';
      this.g().go('online');
    };
  }

  send(m: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  close(): void {
    const ws = this.ws;
    this.ws = null;
    this.room = null;
    this.screen = '';
    ws?.close();
  }

  private sync(drivers: DriverInfo[]): void {
    const you = this.room?.you;
    const ses = this.g().session;
    ses.drivers = drivers.map((d) => ({
      slot: d.slot, name: d.name, money: d.money, points: d.points, up: d.up, nitro: d.nitro,
      device: d.client === null ? null : d.client === you ? this.device : REMOTE,
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
        this.error = m.msg;
        this.close();
        this.g().go('online');
        break;
    }
  }
}
