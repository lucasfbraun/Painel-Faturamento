import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const PORTA_API = process.env['PORT'] ?? '2000';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // Não embutir arquivos como data: URI. As fontes da Roboto viravam
    // `url(data:font/woff2;...)`, que a CSP (`font-src 'self'`) bloqueia — e
    // afrouxar a CSP para permitir `data:` seria pagar em segurança o que se
    // resolve aqui. Como arquivos separados, ainda ganham cache de longo prazo.
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
    // Em desenvolvimento o Vite serve a tela e repassa /api para o servidor Node.
    proxy: {
      '/api': { target: `http://localhost:${PORTA_API}`, changeOrigin: true },
    },
  },
});
