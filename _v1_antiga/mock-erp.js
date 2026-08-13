/**
 * Mock da API do ERP — só para testar o painel sem acesso à rede interna.
 * Uso:  node mock-erp.js        (sobe em http://localhost:8088)
 * Depois: ERP_BASE_URL=http://localhost:8088 ERP_TOKEN=x node server.js
 */
const http = require('node:http');
const { URL } = require('node:url');

const SITS = [0, 1, 2, 2, 2, 3, 4, 5, 6, 6, 6, 7, 8, 9];
const TOTAL = 420;

function d(offsetDias) {
  return new Date(Date.now() - offsetDias * 86400000).toISOString().slice(0, 10);
}

const BASE = Array.from({ length: TOTAL }, (_, i) => {
  const sit = SITS[i % SITS.length];
  const dias = i % 200;
  return {
    codPedido: String(10000 + i),
    codCliente: 4000 + (i % 37),
    dataEmissao: d(dias),
    dataPrevFat: d(Math.max(0, dias - 3)),
    situacao: String(sit),
    nomeLocalEntrega: `CLIENTE EXEMPLO ${i % 37}`,
    itensPedido: [{ itemPedido: 1 }, { itemPedido: 2 }],
    dadosCustomizados: [
      { campo: 'nomeCliente', valor: `CLIENTE EXEMPLO ${i % 37} LTDA` },
      { campo: 'nomeTipoNota', valor: 'VENDA' },
      { campo: 'conferido', valor: i % 3 === 0 ? 'Sim' : 'Não' },
      { campo: 'dataHoraInclusao', valor: `${d(dias)} 10:14:21` },
    ],
  };
});

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://local');
  const ini = u.searchParams.get('dataDigitacaoInicio') || '0000-01-01';
  const fim = u.searchParams.get('dataDigitacaoFim') || '9999-12-31';
  const pag = parseInt(u.searchParams.get('paginacao') || '100', 10);
  const tk = parseInt(u.searchParams.get('continuationToken') || '0', 10);

  const filtrados = BASE.filter((p) => p.dataEmissao >= ini && p.dataEmissao <= fim);
  const fatia = filtrados.slice(tk, tk + pag);
  const prox = tk + pag < filtrados.length ? String(tk + pag) : null;

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ pedidos: fatia, continuationToken: prox }));
}).listen(8088, () => console.log('mock ERP em http://localhost:8088'));
