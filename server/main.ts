import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { CODE_LEN, CODE_LETTERS, ClientMsg } from '../src/net/protocol';
import { Conn, Room } from './room';

const PORT = Number(process.env.PORT) || 5227;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const MAX_ROOMS = 200;
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

// The built game is served from the same port the sockets use.
const http = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  let file = normalize(join(ROOT, path === '/' ? 'index.html' : path));
  if (!file.startsWith(ROOT + sep)) file = join(ROOT, 'index.html');
  try {
    const body = await readFile(file);
    // The page itself is never cached, so a redeploy reaches players at once; hashed assets can be.
    const html = extname(file) === '.html';
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      'cache-control': html ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(ROOT, 'index.html'));
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not built yet');
    }
  }
});

const rooms = new Map<string, Room>();
let nextId = 1;

function newCode(): string {
  for (;;) {
    let c = '';
    for (let i = 0; i < CODE_LEN; i++) c += CODE_LETTERS[(Math.random() * CODE_LETTERS.length) | 0];
    if (!rooms.has(c)) return c;
  }
}

const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: 1024 });

wss.on('connection', (ws) => {
  const conn: Conn = {
    id: nextId++,
    room: null,
    send(m) {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m));
    },
  };
  let count = 0;
  let windowStart = Date.now();

  ws.on('message', (data) => {
    // Inputs arrive about 60 times a second; far more than that is not a game client.
    const now = Date.now();
    if (now - windowStart > 1000) {
      windowStart = now;
      count = 0;
    }
    if (++count > 300) {
      ws.close();
      return;
    }
    let m: ClientMsg;
    try {
      m = JSON.parse(String(data)) as ClientMsg;
    } catch {
      return;
    }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'create' || m.t === 'join') {
      if (conn.room) return;
      let room: Room | undefined;
      if (m.t === 'create') {
        if (rooms.size >= MAX_ROOMS) {
          conn.send({ t: 'error', msg: 'SERVER FULL' });
          return;
        }
        room = new Room(newCode());
        rooms.set(room.code, room);
      } else {
        room = rooms.get(String(m.code).toUpperCase().slice(0, CODE_LEN));
        if (!room) {
          conn.send({ t: 'error', msg: 'ROOM NOT FOUND' });
          return;
        }
      }
      const err = room.add(conn);
      if (err) conn.send({ t: 'error', msg: err });
      return;
    }
    conn.room?.handle(conn, m);
  });

  ws.on('close', () => {
    const room = conn.room;
    if (!room) return;
    room.remove(conn);
    if (!room.conns.size) rooms.delete(room.code);
  });
  ws.on('error', () => ws.close());
});

let last = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  for (const room of rooms.values()) room.update(dt);
}, 1000 / 60);

http.listen(PORT, () => console.log(`MUDLINE server on port ${PORT}`));
