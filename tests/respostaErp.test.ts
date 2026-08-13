import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extrairContinuationToken, extrairPedidos } from '../src/erp/respostaErp.js';

describe('extrairPedidos', () => {
  it('aceita o array solto', () => {
    assert.equal(extrairPedidos([{ codPedido: '1' }]).length, 1);
  });

  it('aceita o array embrulhado nas chaves conhecidas', () => {
    for (const chave of ['pedidos', 'data', 'content', 'itens', 'result']) {
      assert.equal(extrairPedidos({ [chave]: [{ codPedido: '1' }] }).length, 1, `falhou para "${chave}"`);
    }
  });

  it('encontra o array mesmo numa chave desconhecida', () => {
    assert.equal(extrairPedidos({ qualquerCoisa: [{ codPedido: '1' }] }).length, 1);
  });

  it('devolve lista vazia para corpo nulo ou inesperado', () => {
    assert.deepEqual(extrairPedidos(null), []);
    assert.deepEqual(extrairPedidos('texto'), []);
    assert.deepEqual(extrairPedidos({ total: 0 }), []);
  });
});

describe('extrairContinuationToken', () => {
  it('lê o token do corpo', () => {
    assert.equal(extrairContinuationToken({ continuationToken: 'abc' }), 'abc');
    assert.equal(extrairContinuationToken({ proximaPagina: '200' }), '200');
  });

  it('lê o token do header quando não vem no corpo', () => {
    assert.equal(extrairContinuationToken({}, { continuationtoken: 'xyz' }), 'xyz');
  });

  it('trata os marcadores de fim de paginação como ausência de token', () => {
    assert.equal(extrairContinuationToken({ continuationToken: null }), null);
    assert.equal(extrairContinuationToken({ continuationToken: '' }), null);
    assert.equal(extrairContinuationToken({ continuationToken: 'null' }), null);
    assert.equal(extrairContinuationToken({}), null);
  });
});
