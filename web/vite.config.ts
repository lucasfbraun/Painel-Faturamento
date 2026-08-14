import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const PORTA_API = process.env['PORT'] ?? '2000';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // Navegador de TV (Tizen, webOS, Android TV) fica anos atrás do Chrome de
    // desktop. O padrão do Vite 7 é "baseline-widely-available" — Chrome 107+ —
    // o que deixa `?.`, `??` e campos de classe passarem crus para o bundle e
    // quebra a tela em qualquer televisor mais antigo. Aqui fixamos um alvo que
    // o esbuild transpila para sintaxe de 2017.
    target: ['es2017', 'chrome61', 'safari11', 'firefox60', 'edge18'],
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
