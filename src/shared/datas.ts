import type { DataReferencia } from '../dominio/tipos.js';

const MS_POR_DIA = 86_400_000;
const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolve "hoje" no fuso informado — e não no fuso do container, que em Docker
 * costuma ser UTC e viraria o dia 3 horas antes no Brasil.
 */
export function dataDeHoje(fusoHorario: string, agora: Date = new Date()): DataReferencia {
  const formatador = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoHorario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const iso = formatador.format(agora);
  const [ano, mes, dia] = iso.split('-').map(Number) as [number, number, number];
  return { ano, mes, dia, iso };
}

/** Subtrai dias de uma data ISO usando UTC, imune a horário de verão. */
export function subtrairDias(iso: string, dias: number): string {
  if (!FORMATO_ISO.test(iso)) throw new RangeError(`Data ISO inválida: ${iso}`);
  const [ano, mes, dia] = iso.split('-').map(Number) as [number, number, number];
  const instante = Date.UTC(ano, mes - 1, dia) - dias * MS_POR_DIA;
  return new Date(instante).toISOString().slice(0, 10);
}

/** Primeiro dia do ano de uma data ISO. */
export function inicioDoAno(iso: string): string {
  return `${iso.slice(0, 4)}-01-01`;
}

/** Prefixo AAAA-MM de uma data de referência. */
export function prefixoDoMes(ref: DataReferencia): string {
  return `${ref.ano}-${String(ref.mes).padStart(2, '0')}`;
}

export function ehDataIso(valor: unknown): valor is string {
  return typeof valor === 'string' && FORMATO_ISO.test(valor);
}
