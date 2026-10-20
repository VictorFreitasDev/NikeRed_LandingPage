import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || './',
  server: {
    port: 3000,
    open: false,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    cssMinify: true,
  },
});
