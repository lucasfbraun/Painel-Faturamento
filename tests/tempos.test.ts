import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calcularTemposDePicking, contarPorDia, horasDePicking, interpretarCarimbo } from '../src/dominio/tempos.js';
import { Situacao, type Pedido } from '../src/dominio/tipos.js';

function pedido(parcial: Partial<Pedido>): Pedido {
  return {
    codPedido: '1',
    codCliente: '100',
    nomeCliente: 'CLIENTE',
    dataEmissao: '2026-08-13',
    dataPrevFat: '2026-08-13',
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

/** Pedido com um intervalo de picking de N horas a partir do aceite. */
function comPicking(horas: number, aceite = '2026-07-06 08:00:00'): Pedido {
  const inicio = interpretarCarimbo(aceite)!;
  const fim = new Date(inicio + horas * 3_600_000).toISOString().replace('T', ' ').slice(0, 19);
  return pedido({ dataHoraAceite: aceite, retornoPicking: fim });
}

describe('interpretarCarimbo', () => {
  it('lê o formato do ERP', () => {
    assert.equal(interpretarCarimbo('2026-07-06 16:57:59'), Date.UTC(2026, 6, 6, 16, 57, 59));
  });

  it('aceita o separador ISO e a ausência de segundos', () => {
    assert.equal(interpretarCarimbo('2026-07-06T16:57'), Date.UTC(2026, 6, 6, 16, 57, 0));
  });

  it('devolve null para valor ausente ou fora do formato', () => {
    assert.equal(interpretarCarimbo(''), null);
    assert.equal(interpretarCarimbo(null), null);
    assert.equal(interpretarCarimbo('06/07/2026 16:57'), null);
  });
});

describe('horasDePicking', () => {
  it('mede o intervalo do exemplo real da API', () => {
    // aceite 06/07 16:57:59 -> picking 09/07 10:12:22 = 65,24 h
    const p = pedido({ dataHoraAceite: '2026-07-06 16:57:59', retornoPicking: '2026-07-09 10:12:22' });
    assert.ok(Math.abs(horasDePicking(p)! - 65.24) < 0.01);
  });

  it('devolve null quando falta um dos carimbos', () => {
    assert.equal(horasDePicking(pedido({ dataHoraAceite: '2026-07-06 08:00:00' })), null);
    assert.equal(horasDePicking(pedido({ retornoPicking: '2026-07-06 08:00:00' })), null);
    assert.equal(horasDePicking(pedido({})), null);
  });

  it('devolve valor negativo quando o picking antecede o aceite', () => {
    const p = pedido({ dataHoraAceite: '2026-07-06 10:00:00', retornoPicking: '2026-07-06 08:00:00' });
    assert.equal(horasDePicking(p), -2);
  });
});

describe('calcularTemposDePicking', () => {
  it('calcula média, mediana e p90', () => {
    const stats = calcularTemposDePicking([comPicking(2), comPicking(4), comPicking(6), comPicking(100)]);
    assert.equal(stats.amostra, 4);
    assert.equal(stats.mediaHoras, 28);
    assert.equal(stats.medianaHoras, 5);
    assert.equal(stats.minimoHoras, 2);
    assert.equal(stats.maximoHoras, 100);
    assert.ok(stats.p90Horas! > 70, 'o p90 acompanha a cauda que a média dilui');
  });

  it('ignora quem não tem os dois carimbos em vez de contar como zero', () => {
    const stats = calcularTemposDePicking([comPicking(10), pedido({}), pedido({ dataHoraAceite: '2026-07-06 08:00:00' })]);
    assert.equal(stats.amostra, 1);
    assert.equal(stats.semMedicao, 2);
    assert.equal(stats.mediaHoras, 10, 'a média não é diluída pelos pedidos sem medição');
  });

  it('separa os inconsistentes (picking antes do aceite)', () => {
    const invertido = pedido({ dataHoraAceite: '2026-07-06 10:00:00', retornoPicking: '2026-07-06 08:00:00' });
    const stats = calcularTemposDePicking([comPicking(5), invertido]);
    assert.equal(stats.inconsistentes, 1);
    assert.equal(stats.amostra, 1);
    assert.equal(stats.mediaHoras, 5);
  });

  it('devolve tudo nulo quando não há amostra', () => {
    const stats = calcularTemposDePicking([pedido({}), pedido({})]);
    assert.equal(stats.mediaHoras, null);
    assert.equal(stats.amostra, 0);
    assert.equal(stats.semMedicao, 2);
    assert.deepEqual(stats.distribuicao, []);
  });

  it('distribui nas faixas sem perder nem duplicar pedidos', () => {
    const amostra = [comPicking(1), comPicking(5), comPicking(12), comPicking(30), comPicking(60), comPicking(200)];
    const stats = calcularTemposDePicking(amostra);
    assert.deepEqual(
      stats.distribuicao.map((f) => f.quantidade),
      [1, 1, 1, 1, 1, 1],
    );
    assert.equal(
      stats.distribuicao.reduce((t, f) => t + f.quantidade, 0),
      stats.amostra,
    );
  });

  it('coloca o valor exato do limite na faixa de baixo', () => {
    const stats = calcularTemposDePicking([comPicking(4)]);
    assert.equal(stats.distribuicao[0]?.quantidade, 1, '4h fica em "até 4h"');
    assert.equal(stats.distribuicao[1]?.quantidade, 0);
  });
});

describe('contarPorDia', () => {
  it('devolve a série completa, com zeros nos dias sem pedido', () => {
    const serie = contarPorDia(
      [pedido({ dataEmissao: '2026-08-13' }), pedido({ dataEmissao: '2026-08-13' }), pedido({ dataEmissao: '2026-08-11' })],
      '2026-08-13',
      5,
    );
    assert.equal(serie.length, 5);
    assert.deepEqual(serie.map((d) => d.dia), ['2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13']);
    assert.deepEqual(serie.map((d) => d.quantidade), [0, 0, 1, 0, 2]);
  });

  it('acumula a contagem dia a dia', () => {
    const serie = contarPorDia(
      [
        pedido({ dataEmissao: '2026-08-11' }),
        pedido({ dataEmissao: '2026-08-13' }),
        pedido({ dataEmissao: '2026-08-13' }),
      ],
      '2026-08-13',
      5,
    );
    assert.deepEqual(serie.map((d) => d.acumulado), [0, 0, 1, 1, 3]);
    assert.equal(serie[serie.length - 1]?.acumulado, 3, 'o último ponto é o total do período');
  });

  it('o acumulado nunca decresce', () => {
    const serie = contarPorDia([pedido({ dataEmissao: '2026-08-12' })], '2026-08-13', 7);
    serie.forEach((ponto, i) => {
      if (i > 0) assert.ok(ponto.acumulado >= serie[i - 1]!.acumulado);
    });
  });

  it('ignora pedidos fora da janela da série', () => {
    const serie = contarPorDia([pedido({ dataEmissao: '2026-01-01' })], '2026-08-13', 3);
    assert.deepEqual(serie.map((d) => d.quantidade), [0, 0, 0]);
  });
});
