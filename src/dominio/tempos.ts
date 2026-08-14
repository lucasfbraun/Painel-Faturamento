import type { Pedido } from './tipos.js';

/**
 * Métricas de tempo do fluxo interno do pedido.
 *
 * O ERP devolve dois carimbos em `dadosCustomizados`:
 *   • `dataHoraAceite`   — quando o operador aceitou o pedido
 *   • `retornoPicking`   — quando a separação voltou concluída
 *
 * O intervalo entre eles é o tempo que o pedido passou na separação. Pedidos sem
 * um dos carimbos ficam de fora da amostra em vez de contar como zero — zero
 * puxaria a média para baixo e esconderia justamente o que não foi medido.
 */

const CARIMBO = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
const MS_POR_HORA = 3_600_000;

export interface EstatisticasDeTempo {
  /** Média em horas; null quando não há amostra. */
  readonly mediaHoras: number | null;
  readonly medianaHoras: number | null;
  /** 90º percentil — o "pior caso típico", que a média esconde. */
  readonly p90Horas: number | null;
  readonly minimoHoras: number | null;
  readonly maximoHoras: number | null;
  /** Pedidos com os dois carimbos preenchidos. */
  readonly amostra: number;
  /** Pedidos sem carimbo suficiente para medir. */
  readonly semMedicao: number;
  /** Pedidos cujo picking retornou antes do aceite (inconsistência no ERP). */
  readonly inconsistentes: number;
  readonly distribuicao: readonly FaixaDeTempo[];
}

export interface FaixaDeTempo {
  readonly rotulo: string;
  readonly ateHoras: number;
  readonly quantidade: number;
}

const FAIXAS: { rotulo: string; ateHoras: number }[] = [
  { rotulo: 'até 4h', ateHoras: 4 },
  { rotulo: '4–8h', ateHoras: 8 },
  { rotulo: '8–24h', ateHoras: 24 },
  { rotulo: '1–2 dias', ateHoras: 48 },
  { rotulo: '2–3 dias', ateHoras: 72 },
  { rotulo: '3+ dias', ateHoras: Number.POSITIVE_INFINITY },
];

/**
 * Converte "2026-07-06 16:57:59" em milissegundos.
 *
 * Interpretado como horário local do ERP: como só usamos a diferença entre dois
 * carimbos da mesma origem, o fuso se cancela e não há risco de deslocamento.
 */
export function interpretarCarimbo(valor: string | null | undefined): number | null {
  if (!valor) return null;
  const partes = CARIMBO.exec(valor.trim());
  if (!partes) return null;
  const [, ano, mes, dia, hora, minuto, segundo] = partes as unknown as string[];
  const instante = Date.UTC(
    Number(ano),
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto),
    Number(segundo ?? '0'),
  );
  return Number.isNaN(instante) ? null : instante;
}

/** Horas entre o aceite e o retorno do picking; null quando não dá para medir. */
export function horasDePicking(pedido: Pedido): number | null {
  const aceite = interpretarCarimbo(pedido.dataHoraAceite);
  const picking = interpretarCarimbo(pedido.retornoPicking);
  if (aceite === null || picking === null) return null;
  return (picking - aceite) / MS_POR_HORA;
}

function percentil(ordenados: readonly number[], fracao: number): number {
  if (ordenados.length === 1) return ordenados[0]!;
  const posicao = (ordenados.length - 1) * fracao;
  const inferior = Math.floor(posicao);
  const superior = Math.ceil(posicao);
  if (inferior === superior) return ordenados[inferior]!;
  const peso = posicao - inferior;
  return ordenados[inferior]! * (1 - peso) + ordenados[superior]! * peso;
}

function distribuir(valores: readonly number[]): FaixaDeTempo[] {
  return FAIXAS.map((faixa, indice) => {
    const pisoAnterior = indice === 0 ? -Infinity : FAIXAS[indice - 1]!.ateHoras;
    const quantidade = valores.filter((h) => h > pisoAnterior && h <= faixa.ateHoras).length;
    return { rotulo: faixa.rotulo, ateHoras: faixa.ateHoras, quantidade };
  });
}

const VAZIO: EstatisticasDeTempo = {
  mediaHoras: null,
  medianaHoras: null,
  p90Horas: null,
  minimoHoras: null,
  maximoHoras: null,
  amostra: 0,
  semMedicao: 0,
  inconsistentes: 0,
  distribuicao: [],
};

/** Estatísticas do tempo de picking sobre um conjunto de pedidos. */
export function calcularTemposDePicking(pedidos: readonly Pedido[]): EstatisticasDeTempo {
  const medidos: number[] = [];
  let semMedicao = 0;
  let inconsistentes = 0;

  for (const pedido of pedidos) {
    const horas = horasDePicking(pedido);
    if (horas === null) semMedicao += 1;
    else if (horas < 0) inconsistentes += 1;
    else medidos.push(horas);
  }

  if (medidos.length === 0) return { ...VAZIO, semMedicao, inconsistentes };

  const ordenados = [...medidos].sort((a, b) => a - b);
  const soma = medidos.reduce((total, h) => total + h, 0);

  return {
    mediaHoras: soma / medidos.length,
    medianaHoras: percentil(ordenados, 0.5),
    p90Horas: percentil(ordenados, 0.9),
    minimoHoras: ordenados[0]!,
    maximoHoras: ordenados[ordenados.length - 1]!,
    amostra: medidos.length,
    semMedicao,
    inconsistentes,
    distribuicao: distribuir(ordenados),
  };
}

export interface ContagemDiaria {
  /** AAAA-MM-DD */
  readonly dia: string;
  readonly quantidade: number;
  /** Soma de todos os dias da série até este, inclusive. */
  readonly acumulado: number;
}

/**
 * Pedidos por dia de emissão nos últimos `dias`, incluindo os dias sem pedido —
 * um gráfico com buracos mente sobre o ritmo real.
 */
export function contarPorDia(pedidos: readonly Pedido[], ateIso: string, dias: number): ContagemDiaria[] {
  const contagem = new Map<string, number>();
  for (const pedido of pedidos) {
    const dia = pedido.dataEmissao.slice(0, 10);
    if (dia) contagem.set(dia, (contagem.get(dia) ?? 0) + 1);
  }

  const [ano, mes, diaFinal] = ateIso.split('-').map(Number) as [number, number, number];
  const fim = Date.UTC(ano, mes - 1, diaFinal);

  let acumulado = 0;
  return Array.from({ length: dias }, (_, indice) => {
    const dia = new Date(fim - (dias - 1 - indice) * 86_400_000).toISOString().slice(0, 10);
    const quantidade = contagem.get(dia) ?? 0;
    acumulado += quantidade;
    return { dia, quantidade, acumulado };
  });
}
