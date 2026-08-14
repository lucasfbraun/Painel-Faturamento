import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Situacao } from '../dominio/tipos.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export interface ConfigErp {
  readonly baseUrl: string;
  readonly caminho: string;
  readonly empresa: string;
  readonly token: string;
  readonly tlsInseguro: boolean;
  readonly timeoutMs: number;
  readonly paginacao: number;
  readonly maxPaginas: number;
}

export interface ConfigColeta {
  readonly diasRetroativos: number;
  readonly intervaloMin: number;
  readonly intervaloAnoMin: number;
  readonly fusoHorario: string;
  /** Dias exibidos no gráfico de pedidos por dia. */
  readonly diasDaSerie: number;
}

export interface ConfigRegras {
  readonly faturado: readonly number[];
  readonly aberto: readonly number[];
  readonly disponivel: readonly number[];
  /** Situações que não aparecem na tabela (os KPIs continuam contando todas). */
  readonly ocultarNaTabela: readonly number[];
}

export interface Config {
  readonly porta: number;
  /** Interface de escuta. 127.0.0.1 restringe o painel à própria máquina. */
  readonly endereco: string;
  readonly erp: ConfigErp;
  readonly coleta: ConfigColeta;
  readonly regras: ConfigRegras;
  readonly caminhoWeb: string;
  readonly arquivoSnapshot: string;
}

// --- conversores tolerantes -------------------------------------------------

function texto(valor: string | undefined, padrao: string): string {
  const v = valor?.trim();
  return v ? v : padrao;
}

function inteiro(valor: string | undefined, padrao: number): number {
  const n = Number.parseInt(valor ?? '', 10);
  return Number.isFinite(n) ? n : padrao;
}

function decimal(valor: string | undefined, padrao: number): number {
  const n = Number.parseFloat(valor ?? '');
  return Number.isFinite(n) ? n : padrao;
}

function booleano(valor: string | undefined, padrao: boolean): boolean {
  const v = valor?.trim();
  if (!v) return padrao;
  return /^(1|true|sim|yes|on)$/i.test(v);
}

function listaDeInteiros(valor: string | undefined, padrao: readonly number[]): readonly number[] {
  const v = valor?.trim();
  if (!v) return padrao;
  const itens = v.split(/[,;\s]+/).map((x) => Number.parseInt(x, 10)).filter(Number.isFinite);
  return itens.length > 0 ? itens : padrao;
}

/** Lê a configuração do ambiente uma única vez, aplicando padrões seguros. */
export function carregarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return Object.freeze({
    porta: inteiro(env['PORT'], 2000),
    endereco: texto(env['HOST'], '0.0.0.0'),
    erp: Object.freeze({
      baseUrl: texto(env['ERP_BASE_URL'], 'https://10.1.1.220').replace(/\/+$/, ''),
      caminho: texto(env['ERP_PATH'], '/api/comercial/v10/pedidoVenda'),
      empresa: texto(env['ERP_EMPRESA'], '4'),
      token: texto(env['ERP_TOKEN'], ''),
      tlsInseguro: booleano(env['ERP_TLS_INSECURE'], true),
      timeoutMs: inteiro(env['ERP_TIMEOUT_MS'], 60_000),
      paginacao: inteiro(env['ERP_PAGINACAO'], 200),
      maxPaginas: inteiro(env['ERP_MAX_PAGINAS'], 200),
    }),
    coleta: Object.freeze({
      diasRetroativos: inteiro(env['DIAS_RETROATIVOS'], 60),
      intervaloMin: Math.max(1, decimal(env['POLL_INTERVALO_MIN'], 5)),
      intervaloAnoMin: Math.max(1, decimal(env['ANO_INTERVALO_MIN'], 5)),
      fusoHorario: texto(env['TZ_PAINEL'], 'America/Sao_Paulo'),
      diasDaSerie: Math.min(90, Math.max(7, inteiro(env['DIAS_SERIE'], 30))),
    }),
    regras: Object.freeze({
      faturado: listaDeInteiros(env['SIT_FATURADO'], [Situacao.FaturadoTotal]),
      aberto: listaDeInteiros(env['SIT_ABERTO'], [0, 1, 2, 3, 4, 5, 8]),
      disponivel: listaDeInteiros(env['SIT_DISPONIVEL'], [Situacao.Liberado]),
      ocultarNaTabela: listaDeInteiros(env['SIT_OCULTAR_TABELA'], [
        Situacao.FaturadoParcial,
        Situacao.FaturadoTotal,
        Situacao.Cancelado,
      ]),
    }),
    caminhoWeb: texto(env['CAMINHO_WEB'], path.join(RAIZ, 'web', 'dist')),
    arquivoSnapshot: texto(env['ARQUIVO_SNAPSHOT'], path.join(RAIZ, 'data', 'snapshot.json')),
  });
}
