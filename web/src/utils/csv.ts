import type { Pedido } from '../tipos';

const BOM = '﻿';
const SEPARADOR = ';';

const COLUNAS: { titulo: string; valor: (p: Pedido) => string }[] = [
  { titulo: 'Data de emissão', valor: (p) => p.dataEmissao },
  { titulo: 'Pedido', valor: (p) => p.codPedido },
  { titulo: 'Código do cliente', valor: (p) => p.codCliente },
  { titulo: 'Cliente', valor: (p) => p.nomeCliente },
  { titulo: 'Situação', valor: (p) => p.situacaoNome },
  { titulo: 'Conferido', valor: (p) => p.conferido },
];

function escapar(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

/** Gera um CSV compatível com o Excel em português (BOM + ponto e vírgula). */
export function gerarCsv(pedidos: readonly Pedido[]): string {
  const cabecalho = COLUNAS.map((c) => escapar(c.titulo)).join(SEPARADOR);
  const linhas = pedidos.map((pedido) => COLUNAS.map((c) => escapar(c.valor(pedido))).join(SEPARADOR));
  return BOM + [cabecalho, ...linhas].join('\r\n');
}

export function baixarCsv(pedidos: readonly Pedido[], nomeArquivo: string): void {
  const blob = new Blob([gerarCsv(pedidos)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
