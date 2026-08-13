/**
 * Mock da API do ERP — permite rodar o painel sem acesso à rede interna.
 *
 *   npm run build:server && npm run mock
 *   ERP_BASE_URL=http://localhost:8088 ERP_TOKEN=teste npm start
 */
import http from 'node:http';

const PORTA = Number(process.env['PORTA_MOCK'] ?? 8088);
const TOTAL_PEDIDOS = 420;
const SITUACOES_CICLICAS = [0, 1, 2, 2, 2, 3, 4, 5, 6, 6, 6, 7, 8, 9];

function dataMenosDias(dias: number): string {
  return new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
}

const PEDIDOS = Array.from({ length: TOTAL_PEDIDOS }, (_, i) => {
  const dias = i % 200;
  const emissao = dataMenosDias(dias);
  return {
    codPedido: String(10_000 + i),
    codCliente: 4000 + (i % 37),
    dataEmissao: emissao,
    dataPrevFat: dataMenosDias(Math.max(0, dias - 3)),
    situacao: String(SITUACOES_CICLICAS[i % SITUACOES_CICLICAS.length]),
    nomeLocalEntrega: `CLIENTE EXEMPLO ${i % 37}`,
    itensPedido: [{ itemPedido: 1 }, { itemPedido: 2 }],
    dadosCustomizados: [
      { campo: 'nomeCliente', valor: `CLIENTE EXEMPLO ${i % 37} LTDA` },
      { campo: 'nomeTipoNota', valor: 'VENDA' },
      { campo: 'conferido', valor: i % 3 === 0 ? 'Sim' : 'Não' },
      { campo: 'dataHoraInclusao', valor: `${emissao} 10:14:21` },
    ],
  };
});

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const inicio = url.searchParams.get('dataDigitacaoInicio') ?? '0000-01-01';
    const fim = url.searchParams.get('dataDigitacaoFim') ?? '9999-12-31';
    const paginacao = Number(url.searchParams.get('paginacao') ?? 100);
    const cursor = Number(url.searchParams.get('continuationToken') ?? 0);

    const filtrados = PEDIDOS.filter((p) => p.dataEmissao >= inicio && p.dataEmissao <= fim);
    const pagina = filtrados.slice(cursor, cursor + paginacao);
    const proximo = cursor + paginacao < filtrados.length ? String(cursor + paginacao) : null;

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ pedidos: pagina, continuationToken: proximo }));
  })
  .listen(PORTA, () => console.log(`mock do ERP em http://localhost:${PORTA}`));
