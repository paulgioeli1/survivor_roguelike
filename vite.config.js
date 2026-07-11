import { defineConfig } from 'vite';

// Static single-page game. index.html at the project root is the entry;
// everything under src/ is bundled from the module graph it pulls in.
export default defineConfig({
  base: './',
  server: {
    port: 8420
  },
  build: {
    outDir: 'dist',
    target: 'es2020'
  }
});
