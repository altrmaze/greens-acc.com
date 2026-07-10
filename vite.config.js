import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false, // keep static files already copied by the build script
    rollupOptions: {
      input: {
        admin: 'admin.html',
      },
    },
  },
});
