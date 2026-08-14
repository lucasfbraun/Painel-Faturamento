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
    let relativo: string;
    try {
      relativo = caminhoUrl === '/' ? 'index.html' : decodeURIComponent(caminhoUrl).replace(/^\/+/, '');
    } catch {
      // %ZZ e afins: decodeURIComponent lança em vez de devolver texto.
      resposta.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }).end('Caminho inválido');
      return;
    }

    // Byte nulo trunca caminhos em algumas camadas do sistema de arquivos.
    if (relativo.includes('\0')) {
      resposta.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }).end('Caminho inválido');
      return;
    }

    const raizAbsoluta = path.resolve(this.raiz);
    const alvo = path.resolve(raizAbsoluta, relativo);

    // Impede escapar da raiz com "../" — a comparação inclui o separador para
    // que "/app/web/dist-secreto" não passe por prefixo de "/app/web/dist".
    if (alvo !== raizAbsoluta && !alvo.startsWith(raizAbsoluta + path.sep)) {
      resposta.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }).end('Acesso negado');
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
