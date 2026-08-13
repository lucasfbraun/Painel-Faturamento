import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const PORTA_API = process.env['PORT'] ?? '2000';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
    // Em desenvolvimento o Vite serve a tela e repassa /api para o servidor Node.
    proxy: {
      '/api': { target: `http://localhost:${PORTA_API}`, changeOrigin: true },
    },
  },
});
