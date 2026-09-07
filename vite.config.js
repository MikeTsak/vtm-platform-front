import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { imagetools } from 'vite-imagetools';

const BONEYARD_ROUTES = [
  '/',
  '/character',
  '/retainers',
  '/make',
  '/domains',
  '/downtimes',
  '/boons',
  '/schrecknet',
  '/surfaceweb',
  '/live-session',
  '/court/hierarchy',
  '/court/announcements',
  '/court/coteries',
  '/news',
  '/rumors',
  '/admin',
  '/admin/live-session',
  '/admin/npcs',
  '/premonitions',
  '/media/1'
];

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const { boneyardPlugin } = await import('boneyard-js/vite');

  return {
  plugins: [
    react(),
    // Generates multiple sizes of the clan symbol/logo images at build time
    // (see src/data/clans.js) — those ship as one 330px/300px master each
    // today, downloaded in full by every consumer from a 14px badge up to a
    // 128px map icon. imagetools transforms actual JS imports, not runtime
    // string paths, which is why the masters live under src/assets/ instead
    // of public/ now.
    imagetools(),
    boneyardPlugin({
      out: './src/bones',
      routes: BONEYARD_ROUTES,
      breakpoints: [375, 768, 1280],
      wait: 1200
    })
  ],
  server: {
    port: 3002,
    open: true, // open browser on start
    host: true, // listen on all local IPs
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'build', // CRA defaults to build, whereas vite defaults to dist. This maintains compatibility.
    chunkSizeWarningLimit: 2500, // Silences the warning for chunks under 2.5MB
    // Per-route CSS code splitting (Vite's default) is back on. It was
    // disabled as a workaround for the "black screen" bug: a dynamic
    // import()'s CSS chunk 404ing (because a new deploy replaced the build
    // this tab's old index.html still points at) rejected the whole lazy
    // component with nothing catching it. The actual fix is
    // src/utils/lazyWithRetry.js, which every lazy route now goes through —
    // it catches that rejection (JS chunk or CSS chunk, either can 404 the
    // same way) and reloads once to pick up the new build.
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion', '@tanstack/react-query', 'zod', 'react-hook-form']
        }
      }
    }
  }
  };
});
