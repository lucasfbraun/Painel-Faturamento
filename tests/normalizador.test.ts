import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Situacao } from '../src/dominio/tipos.js';
import { interpretarConferido, lerDadoCustomizado, normalizarPedido } from '../src/erp/normalizador.js';

/** Recorte fiel de um pedido devolvido pela API do ERP. */
const PEDIDO_DO_ERP = {
  codPedido: '1',
  codCliente: 4029,
  codRepresentante: '',
  dataEmissao: '2026-06-15',
  dataPrevFat: '2026-06-15',
  situacao: '9',
  nomeLocalEntrega: 'GI INDUSTRIA DE PRODUTOS PLASTICOS LTDA',
  itensPedido: [{ itemPedido: 1 }, { itemPedido: 2 }],
  dadosCustomizados: [
    { campo: 'nomeCliente', valor: 'GI INDUSTRIA DE PRODUTOS PLASTICOS LTDA' },
    { campo: 'nomeTipoNota', valor: 'VENDA' },
    { campo: 'conferido', valor: 'Não' },
    { campo: 'pedidoConferido', valor: '0' },
    { campo: 'dataHoraInclusao', valor: '2026-06-16 10:14:21' },
  ],
};

describe('lerDadoCustomizado', () => {
  it('encontra o campo pelo nome', () => {
    assert.equal(lerDadoCustomizado(PEDIDO_DO_ERP, 'nomeTipoNota'), 'VENDA');
  });

  it('devolve vazio quando o campo não existe', () => {
    assert.equal(lerDadoCustomizado(PEDIDO_DO_ERP, 'inexistente'), '');
  });

  it('devolve vazio quando dadosCustomizados não é array', () => {
    assert.equal(lerDadoCustomizado({ dadosCustomizados: null }, 'x'), '');
  });
});

describe('interpretarConferido', () => {
  it('lê o campo textual conferido', () => {
    assert.equal(interpretarConferido({ dadosCustomizados: [{ campo: 'conferido', valor: 'Sim' }] }), 'Sim');
    assert.equal(interpretarConferido({ dadosCustomizados: [{ campo: 'conferido', valor: 'Não' }] }), 'Não');
  });

  it('aceita as variações 1/0, true/false e sem acento', () => {
    assert.equal(interpretarConferido({ dadosCustomizados: [{ campo: 'conferido', valor: '1' }] }), 'Sim');
    assert.equal(interpretarConferido({ dadosCustomizados: [{ campo: 'conferido', valor: 'true' }] }), 'Sim');
    assert.equal(interpretarConferido({ dadosCustomizados: [{ campo: 'conferido', valor: 'nao' }] }), 'Não');
  });

  it('cai para pedidoConferido quando conferido está ausente', () => {
    assert.equal(interpretarConferido({ dadosCustomizados: [{ campo: 'pedidoConferido', valor: '1' }] }), 'Sim');
  });

  it('assume Não quando não há informação', () => {
    assert.equal(interpretarConferido({}), 'Não');
  });
});

describe('normalizarPedido', () => {
  const pedido = normalizarPedido(PEDIDO_DO_ERP);

  it('converte a situação textual em número e rótulo', () => {
    assert.equal(pedido.situacao, Situacao.Cancelado);
    assert.equal(pedido.situacaoNome, 'Cancelado');
  });

  it('normaliza códigos para texto', () => {
    assert.equal(pedido.codPedido, '1');
    assert.equal(pedido.codCliente, '4029');
  });

  it('prefere o nome do cliente vindo de dadosCustomizados', () => {
    assert.equal(pedido.nomeCliente, 'GI INDUSTRIA DE PRODUTOS PLASTICOS LTDA');
  });

  it('conta os itens do pedido', () => {
    assert.equal(pedido.qtdItens, 2);
  });

  it('sobrevive a um pedido praticamente vazio', () => {
    const vazio = normalizarPedido({});
    assert.equal(vazio.situacao, null);
    assert.equal(vazio.situacaoNome, 'Situação desconhecida');
    assert.equal(vazio.conferido, 'Não');
    assert.equal(vazio.qtdItens, 0);
  });

  it('corta a data quando o ERP devolve data e hora juntas', () => {
    assert.equal(normalizarPedido({ dataEmissao: '2026-06-15 08:30:00' }).dataEmissao, '2026-06-15');
  });
});
