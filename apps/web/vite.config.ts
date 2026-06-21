import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: {
      '@game-trades-club/shared/types': resolve(__dirname, '../../packages/shared/src/types'),
      '@game-trades-club/shared/constants': resolve(__dirname, '../../packages/shared/src/constants'),
      '@game-trades-club/shared/validation': resolve(__dirname, '../../packages/shared/src/validation'),
      '@game-trades-club/shared/formatters': resolve(__dirname, '../../packages/shared/src/formatters'),
      '@game-trades-club/shared/utils': resolve(__dirname, '../../packages/shared/src/utils'),
      '@game-trades-club/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
