import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dataDeHoje, inicioDoAno, prefixoDoMes, subtrairDias } from '../src/shared/datas.js';

describe('dataDeHoje', () => {
  it('resolve a data no fuso de São Paulo, não no UTC do container', () => {
    // 02:00 UTC do dia 14 ainda é dia 13 no Brasil (UTC-3).
    const instante = new Date('2026-08-14T02:00:00Z');
    assert.equal(dataDeHoje('America/Sao_Paulo', instante).iso, '2026-08-13');
    assert.equal(dataDeHoje('UTC', instante).iso, '2026-08-14');
  });

  it('decompõe ano, mês e dia', () => {
    const ref = dataDeHoje('America/Sao_Paulo', new Date('2026-01-05T15:00:00Z'));
    assert.deepEqual(ref, { ano: 2026, mes: 1, dia: 5, iso: '2026-01-05' });
  });
});

describe('subtrairDias', () => {
  it('subtrai 60 dias atravessando meses', () => {
    assert.equal(subtrairDias('2026-08-13', 60), '2026-06-14');
  });

  it('atravessa a virada de ano', () => {
    assert.equal(subtrairDias('2026-01-10', 30), '2025-12-11');
  });

  it('trata ano bissexto', () => {
    assert.equal(subtrairDias('2024-03-01', 1), '2024-02-29');
  });

  it('rejeita data em formato inválido', () => {
    assert.throws(() => subtrairDias('13/08/2026', 1), RangeError);
  });
});

describe('inicioDoAno', () => {
  it('devolve 1º de janeiro do ano da data', () => {
    assert.equal(inicioDoAno('2026-08-13'), '2026-01-01');
  });
});

describe('prefixoDoMes', () => {
  it('formata o mês com dois dígitos', () => {
    assert.equal(prefixoDoMes({ ano: 2026, mes: 3, dia: 9, iso: '2026-03-09' }), '2026-03');
  });
});

