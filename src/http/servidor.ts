import http from 'node:http';
import type { Logger } from '../shared/logger.js';
import type { DependenciasRotas } from './rotas.js';
import { criarRoteador } from './rotas.js';
import { criarAplicadorDeCabecalhos } from './seguranca.js';

export interface ServidorPainel {
  readonly instancia: http.Server;
  ouvir(porta: number, endereco?: string): Promise<void>;
  encerrar(): Promise<void>;
}

export function criarServidor(
  dependencias: DependenciasRotas,
  logger: Logger,
  embutirPermitido = '*',
): ServidorPainel {
  const roteador = criarRoteador(dependencias);
  const aplicarCabecalhosDeSeguranca = criarAplicadorDeCabecalhos(embutirPermitido);

  const instancia = http.createServer((req, res) => {
    aplicarCabecalhosDeSeguranca(res);

    // Nenhuma rota lê corpo de requisição: descartamos o que vier, para o socket
    // não ficar preso esperando drenar.
    req.resume();

    let url: URL;
    try {
      url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    } catch {
      res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'URL inválida' }));
      return;
    }

    Promise.resolve(roteador(req, res, url)).catch((erro: Error) => {
      logger.erro(`falha ao responder ${url.pathname}: ${erro.message}`);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ erro: 'Erro interno do painel' }));
    });
  });

  return {
    instancia,
    ouvir: (porta, endereco) =>
      new Promise<void>((resolver, rejeitar) => {
        instancia.once('error', rejeitar);
        // Defesas contra conexões lentas que ficariam segurando recursos.
        instancia.headersTimeout = 10_000;
        instancia.requestTimeout = 20_000;
        instancia.keepAliveTimeout = 15_000;
        instancia.maxHeadersCount = 100;
        instancia.listen(porta, endereco, () => resolver());
      }),
    encerrar: () => new Promise<void>((resolver) => instancia.close(() => resolver())),
  };
}
