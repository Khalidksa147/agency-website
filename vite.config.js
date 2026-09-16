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
        services: resolve(root, 'services/index.html'),
        arServices: resolve(root, 'ar/services/index.html'),
        work: resolve(root, 'work/index.html'),
        arWork: resolve(root, 'ar/work/index.html'),
        about: resolve(root, 'about/index.html'),
        arAbout: resolve(root, 'ar/about/index.html'),
        contact: resolve(root, 'contact/index.html'),
        arContact: resolve(root, 'ar/contact/index.html'),
      },
    },
  },
});
