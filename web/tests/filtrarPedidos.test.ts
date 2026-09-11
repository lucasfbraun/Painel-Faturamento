import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filtrarEOrdenar } from '../src/dominio/filtrarPedidos.js';
import { Situacao, type Filtros, type Ordenacao, type Pedido } from '../src/tipos.js';

const SEM_FILTROS: Filtros = { busca: '', somenteDisponiveis: false, situacoes: new Set<number>() };
const ORDENACAO_DATA: Ordenacao = { coluna: 'dataEmissao', direcao: 1 };

function pedido(parcial: Partial<Pedido>): Pedido {
  return {
    codPedido: '100',
    codCliente: '1',
    nomeCliente: 'Cliente teste',
    dataEmissao: '2026-08-10',
    dataPrevFat: '2026-08-10',
    situacao: Situacao.Liberado,
    situacaoNome: 'Liberado',
    conferido: 'Não',
    dataInclusao: '',
    dataHoraAceite: '',
    retornoPicking: '',
    tipoNota: 'VENDA',
    representante: '',
    qtdItens: 1,
    ...parcial,
  };
}

function codigos(pedidos: readonly Pedido[]): string[] {
  return pedidos.map((item) => item.codPedido);
}

describe('filtrarEOrdenar', () => {
  it('prioriza pedidos conferidos e, dentro deles, os mais antigos', () => {
    const pedidos = [
      pedido({ codPedido: '300', dataEmissao: '2026-08-03', conferido: 'Não' }),
      pedido({ codPedido: '100', dataEmissao: '2026-08-02', conferido: 'Sim' }),
      pedido({ codPedido: '200', dataEmissao: '2026-08-01', conferido: 'Sim' }),
      pedido({ codPedido: '400', dataEmissao: '2026-08-01', conferido: 'Não' }),
    ];

    assert.deepEqual(codigos(filtrarEOrdenar(pedidos, SEM_FILTROS, ORDENACAO_DATA, [Situacao.Liberado])), [
      '200',
      '100',
      '400',
      '300',
    ]);
  });

  it('mantem a prioridade operacional mesmo quando a coluna escolhida e outra', () => {
    const pedidos = [
      pedido({ codPedido: '900', codCliente: '900', dataEmissao: '2026-08-01', conferido: 'Não' }),
      pedido({ codPedido: '100', codCliente: '100', dataEmissao: '2026-08-03', conferido: 'Sim' }),
      pedido({ codPedido: '200', codCliente: '200', dataEmissao: '2026-08-02', conferido: 'Sim' }),
    ];

    assert.deepEqual(
      codigos(filtrarEOrdenar(pedidos, SEM_FILTROS, { coluna: 'codCliente', direcao: -1 }, [Situacao.Liberado])),
      ['200', '100', '900'],
    );
  });
});
