import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const estilos = [
  readFileSync('web/src/estilos/tokens.css', 'utf8'),
  readFileSync('web/src/estilos/global.css', 'utf8'),
].join('\n');

function tamanhoDaFonteEmPixels(seletor: string): number {
  const seletorEscapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bloco = estilos.match(new RegExp(`${seletorEscapado}\\s*\\{([^}]*)\\}`))?.[1];
  const tamanho = bloco?.match(/font-size:\s*([\d.]+)px/)?.[1];

  assert.ok(tamanho, `o seletor ${seletor} deve declarar font-size em pixels`);
  return Number(tamanho);
}

function valorDoToken(token: string): string {
  const tokenEscapado = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const valor = estilos.match(new RegExp(`${tokenEscapado}:\\s*([^;]+);`))?.[1]?.trim();

  assert.ok(valor, `o token ${token} deve estar definido`);
  return valor;
}

describe('legibilidade da tabela em uma TV', () => {
  it('mantem as informacoes operacionais grandes o bastante para leitura a distancia', () => {
    assert.deepEqual(
      {
        dados: tamanhoDaFonteEmPixels('table'),
        cabecalho: tamanhoDaFonteEmPixels('th'),
        conferencia: tamanhoDaFonteEmPixels('.conferido'),
      },
      { dados: 24, cabecalho: 16, conferencia: 22 },
    );
  });

  it('destaca toda a linha de um pedido conferido com verde forte', () => {
    assert.equal(valorDoToken('--linha-conferida'), 'rgba(76, 175, 80, 0.3)');
  });
});
