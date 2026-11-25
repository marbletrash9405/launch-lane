import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Local dev: the site runs on PORT (default 5173) and forwards /api to the
// API server on API_PORT (default 3001). On Vercel both live on one domain.
const port = Number(process.env.PORT || 5173);
const apiPort = Number(process.env.API_PORT || 3001);

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  envDir: path.resolve(import.meta.dirname, '..', '..'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    fs: { strict: true },
    proxy: {
      '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    proxy: {
      '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
    },
  },
});
