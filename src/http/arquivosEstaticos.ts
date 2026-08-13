import fs from 'node:fs/promises';
import path from 'node:path';
import type { ServerResponse } from 'node:http';

const TIPOS_MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

/**
 * Serve o bundle da tela (web/dist), com fallback para index.html — o painel é
 * uma SPA, então qualquer rota desconhecida devolve o app.
 */
export class ServidorDeArquivos {
  constructor(private readonly raiz: string) {}

  async servir(caminhoUrl: string, resposta: ServerResponse): Promise<void> {
    const relativo = caminhoUrl === '/' ? 'index.html' : decodeURIComponent(caminhoUrl).replace(/^\/+/, '');
    const alvo = path.resolve(this.raiz, relativo);

    // Impede escapar da raiz com "../".
    if (!alvo.startsWith(path.resolve(this.raiz))) {
      resposta.writeHead(403).end('Acesso negado');
      return;
    }

    const conteudo = (await this.ler(alvo)) ?? (await this.ler(path.join(this.raiz, 'index.html')));
    if (!conteudo) {
      resposta.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      resposta.end('Interface não encontrada. Rode "npm run build:web" antes de subir o servidor.');
      return;
    }

    const extensao = path.extname(conteudo.caminho);
    const ehImutavel = /\.[0-9a-f]{8,}\.(js|css|woff2)$/i.test(conteudo.caminho);
    resposta.writeHead(200, {
      'content-type': TIPOS_MIME[extensao] ?? 'application/octet-stream',
      'cache-control': ehImutavel ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    resposta.end(conteudo.bytes);
  }

  private async ler(caminho: string): Promise<{ caminho: string; bytes: Buffer } | null> {
    try {
      const info = await fs.stat(caminho);
      if (!info.isFile()) return null;
      return { caminho, bytes: await fs.readFile(caminho) };
    } catch {
      return null;
    }
  }
}
