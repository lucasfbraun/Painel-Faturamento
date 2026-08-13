import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ColetorDePedidos } from '../aplicacao/coletorDePedidos.js';
import type { ServidorDeArquivos } from './arquivosEstaticos.js';

type Manipulador = (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void> | void;

function responderJson(res: ServerResponse, status: number, dados: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(dados));
}

export interface DependenciasRotas {
  readonly coletor: ColetorDePedidos;
  readonly arquivos: ServidorDeArquivos;
}

/**
 * Tabela de rotas da API. Cada entrada é "MÉTODO /caminho" -> manipulador;
 * o que não casar cai no servidor de arquivos estáticos.
 */
export function criarRoteador({ coletor, arquivos }: DependenciasRotas): Manipulador {
  const rotas: Record<string, Manipulador> = {
    'GET /api/dados': (_req, res) => responderJson(res, 200, coletor.snapshot),

    'GET /api/health': (_req, res) => {
      const { ok, atualizadoEm, erro } = coletor.snapshot;
      responderJson(res, ok ? 200 : 503, { ok, atualizadoEm, erro });
    },

    'POST /api/atualizar': (_req, res) => {
      void coletor.executarCiclo();
      responderJson(res, 202, { iniciado: true });
    },
  };

  return async (req, res, url) => {
    const chave = `${req.method ?? 'GET'} ${url.pathname}`;
    const manipulador = rotas[chave];

    if (manipulador) {
      await manipulador(req, res, url);
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      responderJson(res, 404, { erro: 'Rota não encontrada' });
      return;
    }
    await arquivos.servir(url.pathname, res);
  };
}
