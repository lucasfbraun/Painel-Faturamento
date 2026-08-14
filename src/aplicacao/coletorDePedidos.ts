import { ROTULOS_SITUACAO } from '../config/situacoes.js';
import { agruparPorSituacao, calcularKpis, ocultarSituacoes } from '../dominio/kpis.js';
import { calcularTemposDePicking, contarPorDia } from '../dominio/tempos.js';
import type { Pedido, Snapshot } from '../dominio/tipos.js';
import type { RepositorioPedidosErp } from '../erp/repositorioPedidos.js';
import { dataDeHoje, inicioDoAno, subtrairDias } from '../shared/datas.js';
import type { Logger } from '../shared/logger.js';

export interface OpcoesColetor {
  readonly empresa: string;
  readonly diasRetroativos: number;
  readonly intervaloMin: number;
  readonly intervaloAnoMin: number;
  readonly fusoHorario: string;
  /** Dias exibidos no gráfico de pedidos por dia. */
  readonly diasDaSerie: number;
  readonly regras: {
    readonly faturado: readonly number[];
    readonly aberto: readonly number[];
    readonly disponivel: readonly number[];
    readonly ocultarNaTabela: readonly number[];
  };
}

interface CacheAnual {
  pedidos: readonly Pedido[];
  atualizadoEm: number;
  carimbo: string | null;
}

/**
 * Orquestra um ciclo de coleta:
 *   1. consulta a janela operacional (hoje − N dias .. hoje);
 *   2. atualiza, quando vencido, o cache da consulta anual que alimenta os KPIs;
 *   3. monta o snapshot que a tela consome.
 *
 * Só existe um ciclo em execução por vez — se o ERP demorar mais que o intervalo,
 * o ciclo seguinte é pulado em vez de empilhar requisições.
 */
export class ColetorDePedidos {
  private snapshotAtual: Snapshot;
  private cacheAnual: CacheAnual = { pedidos: [], atualizadoEm: 0, carimbo: null };
  private emExecucao = false;

  constructor(
    private readonly repositorio: RepositorioPedidosErp,
    private readonly opcoes: OpcoesColetor,
    private readonly logger: Logger,
    private readonly agora: () => Date = () => new Date(),
  ) {
    this.snapshotAtual = this.snapshotVazio();
  }

  get snapshot(): Snapshot {
    return this.snapshotAtual;
  }

  /** Restaura um snapshot salvo em disco (usado na subida do servidor). */
  restaurar(snapshot: Snapshot): void {
    this.snapshotAtual = { ...snapshot, meta: { ...this.snapshotVazio().meta, ...snapshot.meta } };
  }

  async executarCiclo(): Promise<void> {
    if (this.emExecucao) {
      this.logger.aviso('ciclo anterior ainda em execução — pulando este');
      return;
    }
    this.emExecucao = true;
    const inicioMs = Date.now();
    const referencia = dataDeHoje(this.opcoes.fusoHorario, this.agora());
    const janela = {
      inicio: subtrairDias(referencia.iso, this.opcoes.diasRetroativos),
      fim: referencia.iso,
      dias: this.opcoes.diasRetroativos,
    };

    try {
      this.logger.info(`consultando janela ${janela.inicio} .. ${janela.fim} (empresa ${this.opcoes.empresa})`);
      const { pedidos, paginas } = await this.repositorio.buscarPorPeriodo(janela);

      await this.atualizarCacheAnualSeVencido(referencia.iso);

      // Os KPIs usam a janela completa; a tabela recebe a versão sem as
      // situações ocultas (por padrão, faturados e cancelados).
      const kpis = calcularKpis(pedidos, this.cacheAnual.pedidos, referencia, this.opcoes.regras);
      const pedidosVisiveis = ocultarSituacoes(pedidos, this.opcoes.regras.ocultarNaTabela);

      // O bloco analítico olha a janela inteira: esconder faturados da tabela não
      // pode distorcer o tempo de picking nem o ritmo de emissão.
      const analitico = {
        picking: calcularTemposDePicking(pedidos),
        porDia: contarPorDia(pedidos, referencia.iso, this.opcoes.diasDaSerie),
      };

      this.snapshotAtual = {
        atualizadoEm: new Date().toISOString(),
        proximaAtualizacao: new Date(Date.now() + this.opcoes.intervaloMin * 60_000).toISOString(),
        ok: true,
        erro: null,
        janela,
        kpis,
        porSituacao: agruparPorSituacao(pedidosVisiveis),
        pedidos: pedidosVisiveis,
        analitico,
        meta: {
          ...this.snapshotAtual.meta,
          anoConsultadoEm: this.cacheAnual.carimbo,
          totalAno: this.cacheAnual.pedidos.length,
          totalJanela: pedidos.length,
          paginas,
        },
      };
      this.logger.info(
        `ciclo concluído — ${pedidos.length} pedidos na janela (${pedidosVisiveis.length} na tabela), ` +
          `${this.cacheAnual.pedidos.length} no ano (${Date.now() - inicioMs}ms)`,
      );
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      // O corpo cru da resposta só vai para o log do servidor, nunca para a tela.
      const detalhe = (erro as { corpo?: string })?.corpo;
      if (detalhe) this.logger.erro(`resposta do ERP: ${detalhe.slice(0, 500)}`);
      this.snapshotAtual = {
        ...this.snapshotAtual,
        ok: false,
        erro: mensagem,
        proximaAtualizacao: new Date(Date.now() + this.opcoes.intervaloMin * 60_000).toISOString(),
      };
      this.logger.erro(`falha no ciclo: ${mensagem}`);
    } finally {
      this.emExecucao = false;
    }
  }

  private async atualizarCacheAnualSeVencido(hojeIso: string): Promise<void> {
    const jaConsultado = this.cacheAnual.carimbo !== null;
    const vencido = Date.now() - this.cacheAnual.atualizadoEm >= this.opcoes.intervaloAnoMin * 60_000;
    if (jaConsultado && !vencido) return;

    const inicio = inicioDoAno(hojeIso);
    this.logger.info(`consultando ano ${inicio} .. ${hojeIso}`);
    const { pedidos } = await this.repositorio.buscarPorPeriodo({ inicio, fim: hojeIso });
    this.cacheAnual = { pedidos, atualizadoEm: Date.now(), carimbo: new Date().toISOString() };
  }

  private snapshotVazio(): Snapshot {
    return {
      atualizadoEm: null,
      proximaAtualizacao: null,
      ok: false,
      erro: null,
      janela: { inicio: '', fim: '', dias: this.opcoes.diasRetroativos },
      kpis: {
        tempoPickingHoras: null,
        faturadosAno: 0,
        faturadosMes: 0,
        faturadosDia: 0,
        emAberto: 0,
        disponiveisFaturar: 0,
      },
      porSituacao: {},
      pedidos: [],
      analitico: {
        picking: calcularTemposDePicking([]),
        porDia: [],
      },
      meta: {
        empresa: this.opcoes.empresa,
        intervaloMin: this.opcoes.intervaloMin,
        situacoes: ROTULOS_SITUACAO,
        sitFaturado: this.opcoes.regras.faturado,
        sitAberto: this.opcoes.regras.aberto,
        sitDisponivel: this.opcoes.regras.disponivel,
        sitOcultarTabela: this.opcoes.regras.ocultarNaTabela,
        anoConsultadoEm: null,
        totalAno: 0,
        totalJanela: 0,
        paginas: 0,
      },
    };
  }
}
