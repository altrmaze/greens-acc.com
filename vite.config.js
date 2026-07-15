import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Current bundle is ~551 kB gzipped to ~157 kB; acceptable for this SPA.
    // Future improvement: split admin sections with dynamic import() to reduce
    // initial load time.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
});
