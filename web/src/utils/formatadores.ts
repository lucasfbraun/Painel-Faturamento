const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}/;

/** 2026-08-13 -> 13/08/2026 */
export function formatarData(iso: string | null | undefined): string {
  if (!iso || !FORMATO_ISO.test(iso)) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** ISO completo -> HH:MM no fuso do navegador */
export function formatarHora(instante: string | null | undefined): string {
  if (!instante) return '—';
  const data = new Date(instante);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatarNumero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}

export function listarCodigos(codigos: readonly number[]): string {
  return codigos.join(', ');
}
