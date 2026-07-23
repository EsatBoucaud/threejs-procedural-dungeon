import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

// Multi-page Vite build: the original Three.js forge remains the map-authoring
// surface while game.html and search.html prove separate saved-state runtimes.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      input: {
        forge: resolve(root, 'index.html'),
        game: resolve(root, 'game.html'),
        search: resolve(root, 'search.html'),
      },
    },
  },
});
