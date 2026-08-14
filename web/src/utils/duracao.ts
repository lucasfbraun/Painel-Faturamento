/** Formatação de durações em horas para leitura humana. */

const HORAS_POR_DIA = 24;

/**
 * 0.5 → "30min" · 5.4 → "5h24" · 65.2 → "2d 17h"
 *
 * A escala muda com a grandeza: minutos importam num picking de meia hora e são
 * ruído num de três dias.
 */
export function formatarDuracao(horas: number | null | undefined): string {
  if (horas === null || horas === undefined || !Number.isFinite(horas)) return '—';
  if (horas < 0) return '—';

  if (horas < 1) return `${Math.round(horas * 60)}min`;

  if (horas < HORAS_POR_DIA) {
    const inteiras = Math.floor(horas);
    const minutos = Math.round((horas - inteiras) * 60);
    if (minutos === 0) return `${inteiras}h`;
    if (minutos === 60) return `${inteiras + 1}h`;
    return `${inteiras}h${String(minutos).padStart(2, '0')}`;
  }

  const dias = Math.floor(horas / HORAS_POR_DIA);
  const restoHoras = Math.round(horas - dias * HORAS_POR_DIA);
  return restoHoras === 0 ? `${dias}d` : `${dias}d ${restoHoras}h`;
}

/** Versão curta para eixos e rótulos apertados: "5h" · "2,7d". */
export function formatarDuracaoCurta(horas: number | null | undefined): string {
  if (horas === null || horas === undefined || !Number.isFinite(horas)) return '—';
  if (horas < HORAS_POR_DIA) return `${Math.round(horas)}h`;
  return `${(horas / HORAS_POR_DIA).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}d`;
}
