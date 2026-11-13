import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5226,
    strictPort: true,
    // In development the game server runs separately on 5227; in production it serves the game itself.
    proxy: { '/ws': { target: 'ws://localhost:5227', ws: true } },
  },
});
