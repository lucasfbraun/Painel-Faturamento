import { rotuloDaSituacao } from '../config/situacoes.js';
import type { Conferido, Pedido, Situacao } from '../dominio/tipos.js';

/** Um item do array dadosCustomizados do ERP. */
interface DadoCustomizado {
  campo?: unknown;
  valor?: unknown;
}

type PedidoBruto = Record<string, unknown>;

function comoTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

/** Lê um campo do array `dadosCustomizados`, que é onde o ERP guarda os extras. */
export function lerDadoCustomizado(pedido: PedidoBruto, campo: string): string {
  const dados = pedido['dadosCustomizados'];
  if (!Array.isArray(dados)) return '';
  const encontrado = (dados as DadoCustomizado[]).find((item) => item?.campo === campo);
  return encontrado ? comoTexto(encontrado.valor) : '';
}

/**
 * "Conferido" vem do campo customizado homônimo (Sim/Não). Quando ausente,
 * caímos para `pedidoConferido` (1/0). Na dúvida, "Não" — é o valor conservador
 * para quem usa o painel para decidir o que faturar.
 */
export function interpretarConferido(pedido: PedidoBruto): Conferido {
  const direto = lerDadoCustomizado(pedido, 'conferido');
  if (direto) {
    if (/^(s|sim|1|true)$/i.test(direto)) return 'Sim';
    if (/^(n|nao|não|0|false)$/i.test(direto)) return 'Não';
  }
  return lerDadoCustomizado(pedido, 'pedidoConferido') === '1' ? 'Sim' : 'Não';
}

function interpretarSituacao(valor: unknown): Situacao | null {
  const numero = Number.parseInt(comoTexto(valor), 10);
  return Number.isFinite(numero) ? (numero as Situacao) : null;
}

function contarItens(pedido: PedidoBruto): number {
  const itens = pedido['itensPedido'];
  return Array.isArray(itens) ? itens.length : 0;
}

/** Converte o pedido cru do ERP no formato estável usado pelo painel. */
export function normalizarPedido(bruto: PedidoBruto): Pedido {
  const situacao = interpretarSituacao(bruto['situacao']);
  return {
    codPedido: comoTexto(bruto['codPedido']),
    codCliente: comoTexto(bruto['codCliente']),
    nomeCliente: lerDadoCustomizado(bruto, 'nomeCliente') || comoTexto(bruto['nomeLocalEntrega']),
    dataEmissao: comoTexto(bruto['dataEmissao']).slice(0, 10),
    dataPrevFat: comoTexto(bruto['dataPrevFat']).slice(0, 10),
    situacao,
    situacaoNome: rotuloDaSituacao(situacao),
    conferido: interpretarConferido(bruto),
    dataInclusao: lerDadoCustomizado(bruto, 'dataHoraInclusao'),
    tipoNota: lerDadoCustomizado(bruto, 'nomeTipoNota'),
    representante: comoTexto(bruto['codRepresentante']),
    qtdItens: contarItens(bruto),
  };
}

export function normalizarPedidos(brutos: readonly PedidoBruto[]): Pedido[] {
  return brutos.map(normalizarPedido);
}
