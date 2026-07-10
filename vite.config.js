import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    open: true, // open browser on start
  },
  build: {
    outDir: 'build', // CRA defaults to build, whereas vite defaults to dist. This maintains compatibility.
  }
});
