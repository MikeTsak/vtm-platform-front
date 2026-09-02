import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
