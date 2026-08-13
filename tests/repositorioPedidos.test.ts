import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RepositorioPedidosErp, type TransporteErp } from '../src/erp/repositorioPedidos.js';

/** Transporte falso que registra as URLs chamadas e devolve páginas pré-programadas. */
function transporteFalso(paginas: { corpo: unknown; headers?: Record<string, string> }[]): TransporteErp & { urls: URL[] } {
  const urls: URL[] = [];
  let indice = 0;
  return {
    urls,
    async obterJson(url: URL) {
      urls.push(url);
      const pagina = paginas[indice++] ?? { corpo: { pedidos: [] } };
      return { corpo: pagina.corpo, headers: pagina.headers ?? {} };
    },
  };
}

const OPCOES = {
  baseUrl: 'https://erp.local',
  caminho: '/api/comercial/v10/pedidoVenda',
  paginacao: 100,
  maxPaginas: 10,
};

describe('RepositorioPedidosErp', () => {
  it('monta a URL com as datas, a paginação e os parâmetros esperados', async () => {
    const transporte = transporteFalso([{ corpo: { pedidos: [] } }]);
    await new RepositorioPedidosErp(transporte, OPCOES).buscarPorPeriodo({ inicio: '2026-06-14', fim: '2026-08-13' });

    const url = transporte.urls[0]!;
    assert.equal(url.pathname, '/api/comercial/v10/pedidoVenda');
    assert.equal(url.searchParams.get('dataDigitacaoInicio'), '2026-06-14');
    assert.equal(url.searchParams.get('dataDigitacaoFim'), '2026-08-13');
    assert.equal(url.searchParams.get('paginacao'), '100');
    assert.equal(url.searchParams.get('continuationToken'), null);
  });

  it('segue o continuationToken até o fim e acumula os pedidos', async () => {
    const transporte = transporteFalso([
      { corpo: { pedidos: [{ codPedido: '1' }, { codPedido: '2' }], continuationToken: '2' } },
      { corpo: { pedidos: [{ codPedido: '3' }], continuationToken: null } },
    ]);

    const { pedidos, paginas } = await new RepositorioPedidosErp(transporte, OPCOES).buscarPorPeriodo({
      inicio: '2026-06-14',
      fim: '2026-08-13',
    });

    assert.equal(paginas, 2);
    assert.deepEqual(pedidos.map((p) => p.codPedido), ['1', '2', '3']);
    assert.equal(transporte.urls[1]!.searchParams.get('continuationToken'), '2');
  });

  it('aceita o token vindo pelo header', async () => {
    const transporte = transporteFalso([
      { corpo: { pedidos: [{ codPedido: '1' }] }, headers: { continuationtoken: 'p2' } },
      { corpo: { pedidos: [{ codPedido: '2' }] } },
    ]);
    const { pedidos } = await new RepositorioPedidosErp(transporte, OPCOES).buscarPorPeriodo({ inicio: 'a', fim: 'b' });
    assert.equal(pedidos.length, 2);
  });

  it('para quando uma página volta vazia, mesmo com token', async () => {
    const transporte = transporteFalso([
      { corpo: { pedidos: [{ codPedido: '1' }], continuationToken: '1' } },
      { corpo: { pedidos: [], continuationToken: '2' } },
    ]);
    const { pedidos, paginas } = await new RepositorioPedidosErp(transporte, OPCOES).buscarPorPeriodo({ inicio: 'a', fim: 'b' });
    assert.equal(paginas, 2);
    assert.equal(pedidos.length, 1);
  });

  it('respeita o limite de páginas para não entrar em laço infinito', async () => {
    const infinitas = Array.from({ length: 50 }, () => ({ corpo: { pedidos: [{ codPedido: 'x' }], continuationToken: 'sempre' } }));
    const transporte = transporteFalso(infinitas);
    const { paginas } = await new RepositorioPedidosErp(transporte, { ...OPCOES, maxPaginas: 3 }).buscarPorPeriodo({
      inicio: 'a',
      fim: 'b',
    });
    assert.equal(paginas, 3);
  });

  it('devolve pedidos já normalizados', async () => {
    const transporte = transporteFalso([{ corpo: [{ codPedido: '7', situacao: '2', codCliente: 99 }] }]);
    const { pedidos } = await new RepositorioPedidosErp(transporte, OPCOES).buscarPorPeriodo({ inicio: 'a', fim: 'b' });
    assert.equal(pedidos[0]!.situacaoNome, 'Liberado');
    assert.equal(pedidos[0]!.codCliente, '99');
  });
});
