import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ColetorDePedidos } from '../src/aplicacao/coletorDePedidos.js';
import { Situacao } from '../src/dominio/tipos.js';
import type { RepositorioPedidosErp } from '../src/erp/repositorioPedidos.js';
import { loggerMudo } from '../src/shared/logger.js';

const OPCOES = {
  titulo: 'Painel de Faturamento',
  subtitulo: 'Filial Nordeste · Grupo Flexível',
  empresa: '4',
  diasRetroativos: 60,
  intervaloMin: 5,
  intervaloAnoMin: 5,
  fusoHorario: 'America/Sao_Paulo',
  diasDaSerie: 30,
  regras: {
    faturado: [Situacao.FaturadoTotal],
    aberto: [0, 1, 2],
    disponivel: [Situacao.Liberado],
    ocultarNaTabela: [Situacao.FaturadoParcial, Situacao.FaturadoTotal, Situacao.Cancelado],
  },
};

const HOJE = () => new Date('2026-08-13T15:00:00Z');

function repositorioFalso(
  responder: (consulta: { inicio: string; fim: string }) => unknown[],
): RepositorioPedidosErp & { consultas: { inicio: string; fim: string }[] } {
  const consultas: { inicio: string; fim: string }[] = [];
  return {
    consultas,
    async buscarPorPeriodo(consulta: { inicio: string; fim: string }) {
      consultas.push(consulta);
      return { pedidos: responder(consulta) as never[], paginas: 1 };
    },
  } as unknown as RepositorioPedidosErp & { consultas: { inicio: string; fim: string }[] };
}

const pedidoLiberado = { situacao: Situacao.Liberado, dataEmissao: '2026-08-10' };
const pedidoFaturado = { situacao: Situacao.FaturadoTotal, dataEmissao: '2026-08-13' };

describe('ColetorDePedidos', () => {
  it('consulta a janela de 60 dias e o ano corrente', async () => {
    const repo = repositorioFalso(() => []);
    await new ColetorDePedidos(repo, OPCOES, loggerMudo, HOJE).executarCiclo();

    assert.deepEqual(repo.consultas[0], { inicio: '2026-06-14', fim: '2026-08-13', dias: 60 });
    assert.deepEqual(repo.consultas[1], { inicio: '2026-01-01', fim: '2026-08-13' });
  });

  it('monta o snapshot com KPIs, distribuição e pedidos', async () => {
    const repo = repositorioFalso((c) => (c.inicio === '2026-01-01' ? [pedidoFaturado] : [pedidoLiberado, pedidoLiberado]));
    const coletor = new ColetorDePedidos(repo, OPCOES, loggerMudo, HOJE);
    await coletor.executarCiclo();

    const { ok, erro, kpis, porSituacao, pedidos, janela } = coletor.snapshot;
    assert.equal(ok, true);
    assert.equal(erro, null);
    assert.equal(pedidos.length, 2);
    assert.equal(janela.dias, 60);
    assert.equal(kpis.disponiveisFaturar, 2);
    assert.equal(kpis.faturadosDia, 1);
    assert.deepEqual(porSituacao, { '2': 2 });
  });

  it('reaproveita o cache anual enquanto ele não vence', async () => {
    const repo = repositorioFalso(() => []);
    const coletor = new ColetorDePedidos(repo, OPCOES, loggerMudo, HOJE);

    await coletor.executarCiclo();
    await coletor.executarCiclo();

    const consultasAnuais = repo.consultas.filter((c) => c.inicio === '2026-01-01');
    assert.equal(consultasAnuais.length, 1, 'o ano deve ser consultado uma vez só dentro do intervalo');
    assert.equal(repo.consultas.length, 3, 'a janela é consultada nos dois ciclos');
  });

  it('mantém os dados anteriores e registra o erro quando o ERP falha', async () => {
    let devePassar = true;
    const repo = repositorioFalso(() => {
      if (!devePassar) throw new Error('HTTP 401 do ERP');
      return [pedidoLiberado];
    });
    const coletor = new ColetorDePedidos(repo, OPCOES, loggerMudo, HOJE);

    await coletor.executarCiclo();
    devePassar = false;
    await coletor.executarCiclo();

    assert.equal(coletor.snapshot.ok, false);
    assert.match(coletor.snapshot.erro ?? '', /401/);
    assert.equal(coletor.snapshot.pedidos.length, 1, 'a tela continua mostrando o último dado bom');
  });

  it('esconde faturados e cancelados da tabela sem afetar os KPIs', async () => {
    const janela = [
      { situacao: Situacao.Liberado, dataEmissao: '2026-08-10' },
      { situacao: Situacao.FaturadoTotal, dataEmissao: '2026-08-13' },
      { situacao: Situacao.FaturadoParcial, dataEmissao: '2026-08-12' },
      { situacao: Situacao.Cancelado, dataEmissao: '2026-08-11' },
    ];
    const coletor = new ColetorDePedidos(repositorioFalso(() => janela), OPCOES, loggerMudo, HOJE);
    await coletor.executarCiclo();

    const { pedidos, porSituacao, kpis, meta } = coletor.snapshot;
    assert.equal(pedidos.length, 1, 'só o pedido liberado aparece na tabela');
    assert.equal(pedidos[0]?.situacao, Situacao.Liberado);
    assert.deepEqual(porSituacao, { '2': 1 }, 'a barra e os filtros acompanham a tabela');
    assert.equal(kpis.faturadosDia, 1, 'o KPI continua contando o faturado do dia');
    assert.equal(kpis.disponiveisFaturar, 1);
    assert.equal(meta.totalJanela, 4, 'a meta preserva o total antes do corte');
  });

  it('expõe as regras de negócio na meta para a tela explicar os KPIs', async () => {
    const coletor = new ColetorDePedidos(repositorioFalso(() => []), OPCOES, loggerMudo, HOJE);
    await coletor.executarCiclo();

    assert.deepEqual(coletor.snapshot.meta.sitDisponivel, [Situacao.Liberado]);
    assert.equal(coletor.snapshot.meta.empresa, '4');
    assert.equal(coletor.snapshot.meta.subtitulo, 'Filial Nordeste · Grupo Flexível');
    assert.equal(coletor.snapshot.meta.situacoes[Situacao.Liberado], 'Liberado');
  });
});
