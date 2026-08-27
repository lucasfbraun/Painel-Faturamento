import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const estilos = readFileSync('web/src/estilos/global.css', 'utf8');

function tamanhoDaFonteEmPixels(seletor: string): number {
  const seletorEscapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bloco = estilos.match(new RegExp(`${seletorEscapado}\\s*\\{([^}]*)\\}`))?.[1];
  const tamanho = bloco?.match(/font-size:\s*([\d.]+)px/)?.[1];

  assert.ok(tamanho, `o seletor ${seletor} deve declarar font-size em pixels`);
  return Number(tamanho);
}

describe('legibilidade da tabela em uma TV', () => {
  it('mantem as informacoes operacionais grandes o bastante para leitura a distancia', () => {
    assert.deepEqual(
      {
        dados: tamanhoDaFonteEmPixels('table'),
        cabecalho: tamanhoDaFonteEmPixels('th'),
        situacao: tamanhoDaFonteEmPixels('.selo'),
        conferencia: tamanhoDaFonteEmPixels('.conferido'),
      },
      { dados: 20, cabecalho: 14, situacao: 18, conferencia: 18 },
    );
  });
});
