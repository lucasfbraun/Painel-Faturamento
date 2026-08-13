import { prefixoDoMes } from '../shared/datas.js';
import type { ContagemPorSituacao, DataReferencia, Kpis, Pedido } from './tipos.js';

export interface RegrasDeSituacao {
  readonly faturado: readonly number[];
  readonly aberto: readonly number[];
  readonly disponivel: readonly number[];
  readonly ocultarNaTabela: readonly number[];
}

/**
 * Remove da listagem as situações que não interessam ao acompanhamento
 * operacional — por padrão, os já faturados e os cancelados.
 *
 * Vale só para a tabela: os KPIs são calculados sobre o conjunto completo, senão
 * "faturados no mês" ficaria sempre zerado.
 */
export function ocultarSituacoes(pedidos: readonly Pedido[], ocultar: readonly number[]): Pedido[] {
  if (ocultar.length === 0) return [...pedidos];
  const escondidas = new Set(ocultar);
  return pedidos.filter((pedido) => pedido.situacao === null || !escondidas.has(pedido.situacao));
}

/** Conta quantos pedidos estão em qualquer uma das situações informadas. */
export function contarPorSituacao(pedidos: readonly Pedido[], situacoes: readonly number[]): number {
  const alvo = new Set(situacoes);
  return pedidos.reduce((total, pedido) => (pedido.situacao !== null && alvo.has(pedido.situacao) ? total + 1 : total), 0);
}

/** Distribuição de pedidos por situação, para a barra e os filtros da tela. */
export function agruparPorSituacao(pedidos: readonly Pedido[]): ContagemPorSituacao {
  const contagem: Record<string, number> = {};
  for (const pedido of pedidos) {
    const chave = pedido.situacao === null ? 'null' : String(pedido.situacao);
    contagem[chave] = (contagem[chave] ?? 0) + 1;
  }
  return contagem;
}

function faturadosNoPeriodo(pedidos: readonly Pedido[], faturado: readonly number[], prefixoData: string): number {
  const alvo = new Set(faturado);
  return pedidos.reduce(
    (total, p) => (p.situacao !== null && alvo.has(p.situacao) && p.dataEmissao.startsWith(prefixoData) ? total + 1 : total),
    0,
  );
}

/**
 * Calcula os cinco KPIs do painel.
 *
 * Os faturados vêm da consulta anual (a janela de 60 dias não cobre o ano);
 * "em aberto" e "disponíveis para faturar" vêm da janela, que é a visão operacional.
 */
export function calcularKpis(
  pedidosDaJanela: readonly Pedido[],
  pedidosDoAno: readonly Pedido[],
  referencia: DataReferencia,
  regras: RegrasDeSituacao,
): Kpis {
  return {
    faturadosAno: faturadosNoPeriodo(pedidosDoAno, regras.faturado, String(referencia.ano)),
    faturadosMes: faturadosNoPeriodo(pedidosDoAno, regras.faturado, prefixoDoMes(referencia)),
    faturadosDia: faturadosNoPeriodo(pedidosDoAno, regras.faturado, referencia.iso),
    emAberto: contarPorSituacao(pedidosDaJanela, regras.aberto),
    disponiveisFaturar: contarPorSituacao(pedidosDaJanela, regras.disponivel),
  };
}
