/** Espelho dos tipos do back-end — o contrato de /api/dados. */

export enum Situacao {
  Digitado = 0,
  Listado = 1,
  Liberado = 2,
  SelecionadoParcial = 3,
  SelecionadoTotal = 4,
  FaturadoParcial = 5,
  FaturadoTotal = 6,
  Transmitido = 7,
  Bloqueado = 8,
  Cancelado = 9,
}

export type Conferido = 'Sim' | 'Não';

export interface Pedido {
  codPedido: string;
  codCliente: string;
  nomeCliente: string;
  dataEmissao: string;
  dataPrevFat: string;
  situacao: Situacao | null;
  situacaoNome: string;
  conferido: Conferido;
  dataInclusao: string;
  dataHoraAceite: string;
  retornoPicking: string;
  tipoNota: string;
  representante: string;
  qtdItens: number;
}

export interface Kpis {
  /** Média de horas entre aceite e retorno do picking; null sem amostra. */
  tempoPickingHoras: number | null;
  faturadosAno: number;
  faturadosMes: number;
  faturadosDia: number;
  emAberto: number;
  disponiveisFaturar: number;
}

export interface FaixaDeTempo {
  rotulo: string;
  ateHoras: number;
  quantidade: number;
}

export interface EstatisticasDeTempo {
  mediaHoras: number | null;
  medianaHoras: number | null;
  p90Horas: number | null;
  minimoHoras: number | null;
  maximoHoras: number | null;
  amostra: number;
  semMedicao: number;
  inconsistentes: number;
  distribuicao: FaixaDeTempo[];
}

export interface ContagemDiaria {
  dia: string;
  quantidade: number;
  /** Soma da série até este dia, inclusive — usado pela curva. */
  acumulado: number;
}

export interface Analitico {
  picking: EstatisticasDeTempo;
  porDia: ContagemDiaria[];
}

export interface Janela {
  inicio: string;
  fim: string;
  dias: number;
}

export interface MetaSnapshot {
  titulo: string;
  subtitulo: string;
  empresa: string;
  intervaloMin: number;
  situacoes: Record<number, string>;
  sitFaturado: number[];
  sitAberto: number[];
  sitDisponivel: number[];
  /** Situações escondidas da tabela (não afetam os KPIs). */
  sitOcultarTabela: number[];
  anoConsultadoEm: string | null;
  totalAno: number;
  /** Total da janela antes de esconder situações. */
  totalJanela: number;
  paginas: number;
}

export interface Snapshot {
  atualizadoEm: string | null;
  proximaAtualizacao: string | null;
  ok: boolean;
  erro: string | null;
  janela: Janela;
  kpis: Kpis;
  porSituacao: Record<string, number>;
  pedidos: Pedido[];
  analitico: Analitico;
  meta: MetaSnapshot;
}

/** Estado dos filtros da tela. */
export interface Filtros {
  situacoes: ReadonlySet<number>;
  somenteDisponiveis: boolean;
  busca: string;
}

export type ColunaOrdenavel = 'dataEmissao' | 'codPedido' | 'codCliente' | 'situacao' | 'conferido';

export interface Ordenacao {
  coluna: ColunaOrdenavel;
  direcao: 1 | -1;
}
