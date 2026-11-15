import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths so the built ./out folder works from any static root.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    target: 'es2019',
    chunkSizeWarningLimit: 1200,
  },
});
