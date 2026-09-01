import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
});
