import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  appType: 'mpa',
  base: '/',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        ar: resolve(root, 'ar/index.html'),
      },
    },
  },
});
