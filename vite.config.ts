import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Raise the warning ceiling; the real win comes from splitting below.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          // Split big, rarely-changing vendor libs into their own cacheable
          // chunks so the browser can parallel-download and cache them, and so
          // feature-only deps (three, socket.io, jszip) aren't bundled into the
          // initial home-page payload.
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'clerk-vendor': ['@clerk/clerk-react', '@clerk/themes'],
            'three-vendor': ['three'],
            'motion-vendor': ['motion'],
            'socket-vendor': ['socket.io-client'],
            'zip-vendor': ['jszip'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:8080',
          ws: true,
        }
      }
    },
  };
});
