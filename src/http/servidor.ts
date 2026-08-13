import http from 'node:http';
import type { Logger } from '../shared/logger.js';
import type { DependenciasRotas } from './rotas.js';
import { criarRoteador } from './rotas.js';

export interface ServidorPainel {
  readonly instancia: http.Server;
  ouvir(porta: number): Promise<void>;
  encerrar(): Promise<void>;
}

export function criarServidor(dependencias: DependenciasRotas, logger: Logger): ServidorPainel {
  const roteador = criarRoteador(dependencias);

  const instancia = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    Promise.resolve(roteador(req, res, url)).catch((erro: Error) => {
      logger.erro(`falha ao responder ${url.pathname}: ${erro.message}`);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'Erro interno do painel' }));
    });
  });

  return {
    instancia,
    ouvir: (porta) =>
      new Promise<void>((resolver, rejeitar) => {
        instancia.once('error', rejeitar);
        instancia.listen(porta, () => resolver());
      }),
    encerrar: () => new Promise<void>((resolver) => instancia.close(() => resolver())),
  };
}
