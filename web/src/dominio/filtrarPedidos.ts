import type { Filtros, Ordenacao, Pedido } from '../tipos';

function atendeBusca(pedido: Pedido, termo: string): boolean {
  if (!termo) return true;
  const alvo = `${pedido.codPedido} ${pedido.codCliente} ${pedido.nomeCliente}`.toLowerCase();
  return alvo.includes(termo);
}

function comparar(a: Pedido, b: Pedido, { coluna, direcao }: Ordenacao): number {
  const valorA = a[coluna] ?? '';
  const valorB = b[coluna] ?? '';
  if (typeof valorA === 'number' && typeof valorB === 'number') return (valorA - valorB) * direcao;
  return String(valorA).localeCompare(String(valorB), 'pt-BR', { numeric: true }) * direcao;
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
