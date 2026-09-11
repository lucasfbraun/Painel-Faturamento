import type { Filtros, Ordenacao, Pedido } from '../tipos';

function atendeBusca(pedido: Pedido, termo: string): boolean {
  if (!termo) return true;
  const alvo = `${pedido.codPedido} ${pedido.codCliente} ${pedido.nomeCliente}`.toLowerCase();
  return alvo.includes(termo);
}

function compararValores(valorA: unknown, valorB: unknown, direcao: Ordenacao['direcao']): number {
  if (typeof valorA === 'number' && typeof valorB === 'number') return (valorA - valorB) * direcao;
  return String(valorA).localeCompare(String(valorB), 'pt-BR', { numeric: true }) * direcao;
}

function compararOrdenacaoEscolhida(a: Pedido, b: Pedido, { coluna, direcao }: Ordenacao): number {
  return compararValores(a[coluna] ?? '', b[coluna] ?? '', direcao);
}

function prioridadeDeConferencia(pedido: Pedido): number {
  return pedido.conferido === 'Sim' ? 0 : 1;
}

function compararPrioridadeOperacional(a: Pedido, b: Pedido): number {
  const porConferencia = prioridadeDeConferencia(a) - prioridadeDeConferencia(b);
  if (porConferencia !== 0) return porConferencia;

  return compararValores(a.dataEmissao, b.dataEmissao, 1);
}

function comparar(a: Pedido, b: Pedido, ordenacao: Ordenacao): number {
  return (
    compararPrioridadeOperacional(a, b) ||
    compararOrdenacaoEscolhida(a, b, ordenacao) ||
    compararValores(a.codPedido, b.codPedido, 1)
  );
}

/** Aplica filtros e ordenação — função pura, fácil de testar e de raciocinar. */
export function filtrarEOrdenar(
  pedidos: readonly Pedido[],
  filtros: Filtros,
  ordenacao: Ordenacao,
  situacoesDisponiveis: readonly number[],
): Pedido[] {
  const disponiveis = new Set(situacoesDisponiveis);
  const termo = filtros.busca.trim().toLowerCase();

  return pedidos
    .filter((pedido) => {
      if (filtros.somenteDisponiveis && (pedido.situacao === null || !disponiveis.has(pedido.situacao))) return false;
      if (filtros.situacoes.size > 0 && (pedido.situacao === null || !filtros.situacoes.has(pedido.situacao))) return false;
      return atendeBusca(pedido, termo);
    })
    .sort((a, b) => comparar(a, b, ordenacao));
}
