// TEMPORARY: throwaway dev config for rendering the Elysium card in a real browser. Delete after use.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { imagetools } from 'vite-imagetools';

export default defineConfig({
  plugins: [react(), imagetools()],
  server: { port: 5199, strictPort: true },
});
