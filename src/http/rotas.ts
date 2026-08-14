import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ColetorDePedidos } from '../aplicacao/coletorDePedidos.js';
import type { ServidorDeArquivos } from './arquivosEstaticos.js';
import { ehMesmaOrigem, LimitadorDeChamadas } from './seguranca.js';

type Manipulador = (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void> | void;

/** Intervalo mínimo entre atualizações manuais. */
const INTERVALO_MINIMO_MS = 10_000;

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
 *
 * Todas as rotas são de leitura, exceto `/api/atualizar`, que apenas antecipa o
 * ciclo de coleta. Nenhuma escreve no ERP.
 */
export function criarRoteador({ coletor, arquivos }: DependenciasRotas): Manipulador {
  const limitador = new LimitadorDeChamadas(INTERVALO_MINIMO_MS);

  const rotas: Record<string, Manipulador> = {
    'GET /api/dados': (_req, res) => responderJson(res, 200, coletor.snapshot),

    'GET /api/health': (_req, res) => {
      const { ok, atualizadoEm, erro } = coletor.snapshot;
      responderJson(res, ok ? 200 : 503, { ok, atualizadoEm, erro });
    },

    'POST /api/atualizar': (req, res) => {
      if (!ehMesmaOrigem(req)) {
        responderJson(res, 403, { erro: 'Requisição de outra origem' });
        return;
      }
      if (!limitador.permitir()) {
        responderJson(res, 429, { erro: 'Aguarde alguns segundos antes de atualizar de novo' });
        return;
      }
      void coletor.executarCiclo();
      responderJson(res, 202, { iniciado: true });
    },
  };

  return async (req, res, url) => {
    const metodo = req.method ?? 'GET';

    // HEAD é tratado como GET sem corpo; qualquer outro verbo não existe aqui.
    if (!['GET', 'HEAD', 'POST'].includes(metodo)) {
      res.setHeader('allow', 'GET, HEAD, POST');
      responderJson(res, 405, { erro: 'Método não permitido' });
      return;
    }

    const manipulador = rotas[`${metodo === 'HEAD' ? 'GET' : metodo} ${url.pathname}`];
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
