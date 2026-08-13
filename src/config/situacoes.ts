import { Situacao } from '../dominio/tipos.js';

/** Rótulo legível de cada situação (fonte única da verdade, usada também pela tela). */
export const ROTULOS_SITUACAO: Readonly<Record<number, string>> = Object.freeze({
  [Situacao.Digitado]: 'Digitado',
  [Situacao.Listado]: 'Listado',
  [Situacao.Liberado]: 'Liberado',
  [Situacao.SelecionadoParcial]: 'Selecionado Parcial',
  [Situacao.SelecionadoTotal]: 'Selecionado Total',
  [Situacao.FaturadoParcial]: 'Faturado Parcial',
  [Situacao.FaturadoTotal]: 'Faturado Total',
  [Situacao.Transmitido]: 'Transmitido',
  [Situacao.Bloqueado]: 'Bloqueado',
  [Situacao.Cancelado]: 'Cancelado',
});

export function rotuloDaSituacao(codigo: number | null | undefined): string {
  if (codigo === null || codigo === undefined) return 'Situação desconhecida';
  return ROTULOS_SITUACAO[codigo] ?? `Situação ${codigo}`;
}
