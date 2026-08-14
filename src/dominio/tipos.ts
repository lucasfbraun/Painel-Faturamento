/**
 * Tipos do domínio — a linguagem do negócio.
 * Nenhum detalhe de HTTP, de arquivo ou de tela aparece aqui.
 */

/** Códigos de situação do pedido, conforme a API do ERP. */
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

/** Pedido já normalizado — o que o resto da aplicação enxerga. */
export interface Pedido {
  readonly codPedido: string;
  readonly codCliente: string;
  readonly nomeCliente: string;
  /** AAAA-MM-DD */
  readonly dataEmissao: string;
  /** AAAA-MM-DD */
  readonly dataPrevFat: string;
  readonly situacao: Situacao | null;
  readonly situacaoNome: string;
  readonly conferido: Conferido;
  readonly dataInclusao: string;
  /** "AAAA-MM-DD HH:mm:ss" — quando o operador aceitou o pedido. */
  readonly dataHoraAceite: string;
  /** "AAAA-MM-DD HH:mm:ss" — quando a separação retornou concluída. */
  readonly retornoPicking: string;
  readonly tipoNota: string;
  readonly representante: string;
  readonly qtdItens: number;
}

export interface Kpis {
  /** Média de horas entre o aceite e o retorno do picking; null sem amostra. */
  readonly tempoPickingHoras: number | null;
  readonly faturadosAno: number;
  readonly faturadosMes: number;
  readonly faturadosDia: number;
  readonly emAberto: number;
  readonly disponiveisFaturar: number;
}

export interface Janela {
  /** AAAA-MM-DD */
  readonly inicio: string;
  /** AAAA-MM-DD */
  readonly fim: string;
  readonly dias: number;
}

/** Contagem de pedidos por código de situação. */
export type ContagemPorSituacao = Readonly<Record<string, number>>;

export interface MetaSnapshot {
  /** Título do painel, definido em PAINEL_TITULO. */
  readonly titulo: string;
  /** Unidade/filial, definida em PAINEL_SUBTITULO. */
  readonly subtitulo: string;
  readonly empresa: string;
  readonly intervaloMin: number;
  readonly situacoes: Readonly<Record<number, string>>;
  readonly sitFaturado: readonly number[];
  readonly sitAberto: readonly number[];
  readonly sitDisponivel: readonly number[];
  readonly sitOcultarTabela: readonly number[];
  readonly anoConsultadoEm: string | null;
  readonly totalAno: number;
  /** Total de pedidos da janela antes de ocultar situações na tabela. */
  readonly totalJanela: number;
  readonly paginas: number;
}

/** Bloco analítico: séries e distribuições que a tela desenha. */
export interface Analitico {
  readonly picking: import('./tempos.js').EstatisticasDeTempo;
  readonly porDia: readonly import('./tempos.js').ContagemDiaria[];
}

/** Fotografia do estado do painel — é isso que a API devolve para a tela. */
export interface Snapshot {
  readonly atualizadoEm: string | null;
  readonly proximaAtualizacao: string | null;
  readonly ok: boolean;
  readonly erro: string | null;
  readonly janela: Janela;
  readonly kpis: Kpis;
  readonly porSituacao: ContagemPorSituacao;
  readonly pedidos: readonly Pedido[];
  readonly analitico: Analitico;
  readonly meta: MetaSnapshot;
}

/** Data de referência do painel, já resolvida no fuso configurado. */
export interface DataReferencia {
  readonly ano: number;
  readonly mes: number;
  readonly dia: number;
  /** AAAA-MM-DD */
  readonly iso: string;
}
