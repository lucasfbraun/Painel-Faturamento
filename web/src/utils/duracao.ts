/**
 * Formatação de durações.
 *
 * **Uma unidade só, em toda a tela: horas.** A versão anterior trocava de
 * notação conforme a grandeza ("45min", "1h30", "2d 17h"), o que obrigava a
 * converter de cabeça para comparar um número com o outro. Horas inteiras em
 * todo lugar deixam os valores diretamente comparáveis.
 */

/** 0.4 → "menos de 1h" · 20 → "20h" · 65.2 → "65h" */
export function formatarHoras(horas: number | null | undefined): string {
  if (horas === null || horas === undefined || !Number.isFinite(horas) || horas < 0) return '—';
  if (horas < 1) return 'menos de 1h';
  return `${Math.round(horas).toLocaleString('pt-BR')}h`;
}

/**
 * Equivalente em dias, para quem precisa da referência — usado só nas
 * explicações, nunca como valor principal, para não voltar a misturar unidades.
 */
export function emDias(horas: number | null | undefined): string {
  if (horas === null || horas === undefined || !Number.isFinite(horas) || horas < 24) return '';
  const dias = horas / 24;
  return `${dias.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
}
