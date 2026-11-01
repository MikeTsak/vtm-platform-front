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
export default defineConfig(async ({ mode }) => {
  // The boneyard plugin launches headless Chromium on dev-server start AND after
  // every file save (20 routes x 3 breakpoints, well over a minute each pass).
  // Only load it on demand: `npm run dev:bones`. Normal `npm run dev` skips it.
  const boneyard = mode === 'bones'
    ? [(await import('boneyard-js/vite')).boneyardPlugin({
        out: './src/bones',
        routes: BONEYARD_ROUTES,
        breakpoints: [375, 768, 1280],
        wait: 1200
      })]
    : [];

  return {
  plugins: [
    react(),
    // Generates multiple sizes of the clan symbol/logo images at build time
    // (see src/data/clans.js), those ship as one 330px/300px master each
    // today, downloaded in full by every consumer from a 14px badge up to a
    // 128px map icon. imagetools transforms actual JS imports, not runtime
    // string paths, which is why the masters live under src/assets/ instead
    // of public/ now.
    imagetools(),
    ...boneyard
  ],
  server: {
    port: 3002,
    open: true, // open browser on start
    host: true, // listen on all local IPs
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      '/public': {
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
    // src/utils/lazyWithRetry.js, which every lazy route now goes through:
    // it catches that rejection (JS chunk or CSS chunk, either can 404 the
    // same way) and reloads once to pick up the new build.
    rollupOptions: {
      output: {
        // A function, not the { chunk: [packages] } object form: the object form also
        // pulls each package's dependency graph into its chunk, and that is how Vite's
        // dynamic-import helper ended up inside vendor-maps, so index.html preloaded the
        // 1.8 MB map bundle on every page (every lazy route imports that helper).
        // Only the packages themselves are assigned here; everything else is left to Rollup.
        manualChunks(id) {
          // Bundler runtime helpers every chunk imports: pin them to the shell chunk, or
          // Rollup parks them in some other shared chunk (it chose vendor-maps) and the
          // entry has to load that whole chunk just to get them.
          if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) return 'vendor';
          if (!id.includes('node_modules')) return undefined;
          // The app shell's first paint. framer-motion, zod and react-hook-form were pinned
          // here too, so every page downloaded them; they now travel with the routes using them.
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@tanstack\/react-query|@tanstack\/query-core)\//.test(id)) return 'vendor';
          if (/node_modules\/(maplibre-gl|@deck\.gl|@luma\.gl|@loaders\.gl|@math\.gl|@probe\.gl)\//.test(id)) return 'vendor-maps';
          if (/node_modules\/@antv\//.test(id)) return 'vendor-charts';
          return undefined;
        }
      }
    }
  }
  };
});
