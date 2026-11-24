import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  server: {
    watch: { ignored: ['**/temp/**', '**/release/**', '**/landing-page/**'] },
  },
  optimizeDeps: {
    entries: ['index.html', 'dashboard.html', 'settings.html'],
  },
  build: {
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        settings:  resolve(__dirname, 'settings.html'),
      },
    },
  },
});
