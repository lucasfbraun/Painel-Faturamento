import type { Pedido } from '../dominio/tipos.js';
import { normalizarPedidos } from './normalizador.js';
import { extrairContinuationToken, extrairPedidos } from './respostaErp.js';

export interface ConsultaPorPeriodo {
  /** AAAA-MM-DD */
  readonly inicio: string;
  /** AAAA-MM-DD */
  readonly fim: string;
}

export interface ResultadoConsulta {
  readonly pedidos: readonly Pedido[];
  readonly paginas: number;
}

/** O mínimo que o repositório precisa de um cliente HTTP — facilita substituir nos testes. */
export interface TransporteErp {
  obterJson(url: URL): Promise<{ corpo: unknown; headers: Record<string, string | string[] | undefined> }>;
}

export interface OpcoesRepositorio {
  readonly baseUrl: string;
  readonly caminho: string;
  readonly paginacao: number;
  readonly maxPaginas: number;
}

/**
 * Acesso aos pedidos de venda do ERP.
 *
 * Responsabilidade única: montar a URL da consulta, percorrer todas as páginas
 * via continuationToken e devolver pedidos já normalizados.
 */
export class RepositorioPedidosErp {
  constructor(
    private readonly transporte: TransporteErp,
    private readonly opcoes: OpcoesRepositorio,
  ) {}

  async buscarPorPeriodo({ inicio, fim }: ConsultaPorPeriodo): Promise<ResultadoConsulta> {
    const acumulado: Pedido[] = [];
    let token: string | null = null;
    let paginas = 0;

    do {
      const { corpo, headers } = await this.transporte.obterJson(this.montarUrl(inicio, fim, token));
      const lote = extrairPedidos(corpo);
      acumulado.push(...normalizarPedidos(lote));
      paginas += 1;

      if (lote.length === 0) break;
      token = extrairContinuationToken(corpo, headers);
    } while (token !== null && paginas < this.opcoes.maxPaginas);

    return { pedidos: acumulado, paginas };
  }

  private montarUrl(inicio: string, fim: string, token: string | null): URL {
    const url = new URL(this.opcoes.baseUrl + this.opcoes.caminho);
    url.searchParams.set('dataDigitacaoInicio', inicio);
    url.searchParams.set('dataDigitacaoFim', fim);
    if (this.opcoes.paginacao > 0) url.searchParams.set('paginacao', String(this.opcoes.paginacao));
    if (token) url.searchParams.set('continuationToken', token);
    return url;
  }
}
