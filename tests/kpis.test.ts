import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { agruparPorSituacao, calcularKpis, contarPorSituacao, ocultarSituacoes } from '../src/dominio/kpis.js';
import { Situacao, type DataReferencia, type Pedido } from '../src/dominio/tipos.js';

const REGRAS = {
  faturado: [Situacao.FaturadoTotal],
  aberto: [0, 1, 2, 3, 4, 5, 8],
  disponivel: [Situacao.Liberado],
  ocultarNaTabela: [Situacao.FaturadoParcial, Situacao.FaturadoTotal, Situacao.Cancelado],
};

const REFERENCIA: DataReferencia = { ano: 2026, mes: 8, dia: 13, iso: '2026-08-13' };

function pedido(parcial: Partial<Pedido>): Pedido {
  return {
    codPedido: '1',
    codCliente: '100',
    nomeCliente: 'CLIENTE',
    dataEmissao: '2026-08-13',
    dataPrevFat: '2026-08-13',
    situacao: Situacao.Digitado,
    situacaoNome: 'Digitado',
    conferido: 'Não',
    dataInclusao: '',
    tipoNota: 'VENDA',
    representante: '',
    qtdItens: 1,
    ...parcial,
  };
}

describe('contarPorSituacao', () => {
  it('conta apenas as situações pedidas', () => {
    const pedidos = [
      pedido({ situacao: Situacao.Liberado }),
      pedido({ situacao: Situacao.Liberado }),
      pedido({ situacao: Situacao.Cancelado }),
    ];
    assert.equal(contarPorSituacao(pedidos, [Situacao.Liberado]), 2);
  });

  it('ignora pedidos com situação desconhecida', () => {
    assert.equal(contarPorSituacao([pedido({ situacao: null })], [0, 1, 2]), 0);
  });

  it('devolve zero para lista vazia', () => {
    assert.equal(contarPorSituacao([], [Situacao.Liberado]), 0);
  });
});

describe('agruparPorSituacao', () => {
  it('agrupa a contagem por código', () => {
    const pedidos = [
      pedido({ situacao: Situacao.Liberado }),
      pedido({ situacao: Situacao.Liberado }),
      pedido({ situacao: Situacao.Bloqueado }),
      pedido({ situacao: null }),
    ];
    assert.deepEqual(agruparPorSituacao(pedidos), { '2': 2, '8': 1, null: 1 });
  });
});

describe('ocultarSituacoes', () => {
  const janela = [
    pedido({ codPedido: 'A', situacao: Situacao.Liberado }),
    pedido({ codPedido: 'B', situacao: Situacao.FaturadoParcial }),
    pedido({ codPedido: 'C', situacao: Situacao.FaturadoTotal }),
    pedido({ codPedido: 'D', situacao: Situacao.Cancelado }),
    pedido({ codPedido: 'E', situacao: Situacao.Digitado }),
    pedido({ codPedido: 'F', situacao: null }),
  ];

  it('remove faturados e cancelados da tabela', () => {
    const visiveis = ocultarSituacoes(janela, REGRAS.ocultarNaTabela);
    assert.deepEqual(visiveis.map((p) => p.codPedido), ['A', 'E', 'F']);
  });

  it('mantém pedidos de situação desconhecida — some-los esconderia problema', () => {
    const visiveis = ocultarSituacoes(janela, REGRAS.ocultarNaTabela);
    assert.ok(visiveis.some((p) => p.situacao === null));
  });

  it('devolve tudo quando a lista de ocultas está vazia', () => {
    assert.equal(ocultarSituacoes(janela, []).length, janela.length);
  });

  it('não altera a lista original', () => {
    ocultarSituacoes(janela, REGRAS.ocultarNaTabela);
    assert.equal(janela.length, 6);
  });

  it('respeita uma configuração customizada', () => {
    const visiveis = ocultarSituacoes(janela, [Situacao.FaturadoTotal, Situacao.Cancelado]);
    assert.deepEqual(visiveis.map((p) => p.codPedido), ['A', 'B', 'E', 'F']);
  });
});

describe('calcularKpis', () => {
  const pedidosDoAno = [
    pedido({ situacao: Situacao.FaturadoTotal, dataEmissao: '2026-08-13' }), // hoje
    pedido({ situacao: Situacao.FaturadoTotal, dataEmissao: '2026-08-01' }), // mês
    pedido({ situacao: Situacao.FaturadoTotal, dataEmissao: '2026-03-10' }), // ano
    pedido({ situacao: Situacao.FaturadoParcial, dataEmissao: '2026-08-13' }), // não conta
    pedido({ situacao: Situacao.FaturadoTotal, dataEmissao: '2025-12-31' }), // ano anterior
  ];

  const pedidosDaJanela = [
    pedido({ situacao: Situacao.Liberado }),
    pedido({ situacao: Situacao.Liberado }),
    pedido({ situacao: Situacao.Digitado }),
    pedido({ situacao: Situacao.Bloqueado }),
    pedido({ situacao: Situacao.FaturadoTotal }),
    pedido({ situacao: Situacao.Cancelado }),
  ];

  const kpis = calcularKpis(pedidosDaJanela, pedidosDoAno, REFERENCIA, REGRAS);

  it('conta faturados do ano sem incluir o ano anterior', () => {
    assert.equal(kpis.faturadosAno, 3);
  });

  it('conta faturados do mês corrente', () => {
    assert.equal(kpis.faturadosMes, 2);
  });

  it('conta faturados do dia', () => {
    assert.equal(kpis.faturadosDia, 1);
  });

  it('não conta faturamento parcial quando a regra pede só o total', () => {
    const soParcial = [pedido({ situacao: Situacao.FaturadoParcial, dataEmissao: '2026-08-13' })];
    assert.equal(calcularKpis([], soParcial, REFERENCIA, REGRAS).faturadosDia, 0);
  });

  it('respeita uma regra customizada de faturado', () => {
    const regras = { ...REGRAS, faturado: [Situacao.FaturadoParcial, Situacao.FaturadoTotal] };
    assert.equal(calcularKpis([], pedidosDoAno, REFERENCIA, regras).faturadosDia, 2);
  });

  it('em aberto exclui faturado total e cancelado', () => {
    assert.equal(kpis.emAberto, 4);
  });

  it('disponíveis para faturar conta apenas os liberados', () => {
    assert.equal(kpis.disponiveisFaturar, 2);
  });

  it('usa a consulta anual, e não a janela, para os faturados', () => {
    assert.equal(calcularKpis(pedidosDaJanela, [], REFERENCIA, REGRAS).faturadosAno, 0);
  });
});
