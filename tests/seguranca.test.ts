import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { ColetorDePedidos } from '../src/aplicacao/coletorDePedidos.js';
import { ErroErp } from '../src/erp/erroErp.js';
import { ServidorDeArquivos } from '../src/http/arquivosEstaticos.js';
import { ehMesmaOrigem, interpretarPoliticaDeEmbutir, LimitadorDeChamadas } from '../src/http/seguranca.js';
import { criarServidor, type ServidorPainel } from '../src/http/servidor.js';
import { loggerMudo } from '../src/shared/logger.js';

// ------------------------------------------------------------- utilidades ---

function requisicaoFalsa(headers: Record<string, string>): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

let ciclosExecutados = 0;

const coletorFalso = {
  snapshot: { ok: true, atualizadoEm: null, erro: null, pedidos: [] },
  executarCiclo: () => {
    ciclosExecutados += 1;
    return Promise.resolve();
  },
} as unknown as ColetorDePedidos;

let servidor: ServidorPainel;
let base: string;
let raizWeb: string;

before(async () => {
  raizWeb = await fs.mkdtemp(path.join(os.tmpdir(), 'painel-web-'));
  await fs.writeFile(path.join(raizWeb, 'index.html'), '<!doctype html><title>painel</title>');
  // Arquivo fora da raiz servida, alvo de uma tentativa de travessia.
  await fs.writeFile(path.join(raizWeb, '..', 'segredo-do-painel.txt'), 'TOKEN=secreto');

  servidor = criarServidor({ coletor: coletorFalso, arquivos: new ServidorDeArquivos(raizWeb) }, loggerMudo);
  await servidor.ouvir(0, '127.0.0.1');
  const endereco = servidor.instancia.address();
  base = `http://127.0.0.1:${typeof endereco === 'object' && endereco ? endereco.port : 0}`;
});

after(async () => {
  await servidor.encerrar();
  await fs.rm(raizWeb, { recursive: true, force: true });
});

// ---------------------------------------------------------------- testes ---

describe('cabeçalhos de segurança', () => {
  it('aplica CSP, nosniff e política de referenciador em toda resposta', async () => {
    const resposta = await fetch(`${base}/api/dados`);
    assert.match(resposta.headers.get('content-security-policy') ?? '', /default-src 'self'/);
    assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(resposta.headers.get('referrer-policy'), 'no-referrer');
  });

  it('no padrão, permite exibição em iframe — é assim que o software de TV carrega', async () => {
    const resposta = await fetch(`${base}/`);
    assert.match(resposta.headers.get('content-security-policy') ?? '', /frame-ancestors \*/);
    assert.equal(resposta.headers.get('x-frame-options'), null, 'X-Frame-Options bloquearia o iframe');
    assert.equal(resposta.headers.get('cross-origin-resource-policy'), 'cross-origin');
  });

  it('não expõe cabeçalho de origem cruzada — o painel não é uma API pública', async () => {
    const resposta = await fetch(`${base}/api/dados`);
    assert.equal(resposta.headers.get('access-control-allow-origin'), null);
  });
});

describe('travessia de diretório', () => {
  const ataques = [
    '/../segredo-do-painel.txt',
    '/..%2fsegredo-do-painel.txt',
    '/%2e%2e/segredo-do-painel.txt',
    '/subpasta/../../segredo-do-painel.txt',
  ];

  for (const caminho of ataques) {
    it(`não entrega arquivo fora da raiz: ${caminho}`, async () => {
      const resposta = await fetch(`${base}${caminho}`);
      const corpo = await resposta.text();
      assert.ok(!corpo.includes('TOKEN=secreto'), 'vazou arquivo de fora da raiz');
    });
  }

  it('recusa caminho com codificação percentual inválida', async () => {
    const resposta = await fetch(`${base}/%ZZ`);
    assert.equal(resposta.status, 400);
  });
});

describe('POST /api/atualizar', () => {
  it('recusa requisição vinda de outra origem', async () => {
    const resposta = await fetch(`${base}/api/atualizar`, {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site' },
    });
    assert.equal(resposta.status, 403);
  });

  it('aceita requisição da própria página e limita a frequência', async () => {
    const primeira = await fetch(`${base}/api/atualizar`, {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin' },
    });
    assert.equal(primeira.status, 202);
    assert.equal(ciclosExecutados, 1, 'a chamada aceita dispara exatamente um ciclo');

    const segunda = await fetch(`${base}/api/atualizar`, {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin' },
    });
    assert.equal(segunda.status, 429, 'a segunda chamada seguida deve ser barrada');
    assert.equal(ciclosExecutados, 1, 'a chamada barrada não pode tocar o ERP');
  });
});

describe('métodos e rotas', () => {
  it('recusa verbos que a aplicação não usa', async () => {
    const resposta = await fetch(`${base}/api/dados`, { method: 'DELETE' });
    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get('allow'), 'GET, HEAD, POST');
  });

  it('devolve 404 em JSON para rota inexistente sob /api', async () => {
    const resposta = await fetch(`${base}/api/inexistente`);
    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: 'Rota não encontrada' });
  });
});

describe('ehMesmaOrigem', () => {
  it('confia no Sec-Fetch-Site quando o navegador o envia', () => {
    assert.equal(ehMesmaOrigem(requisicaoFalsa({ 'sec-fetch-site': 'same-origin' })), true);
    assert.equal(ehMesmaOrigem(requisicaoFalsa({ 'sec-fetch-site': 'none' })), true);
    assert.equal(ehMesmaOrigem(requisicaoFalsa({ 'sec-fetch-site': 'cross-site' })), false);
  });

  it('aceita same-site: é como o navegador classifica o botão dentro do iframe da TV', () => {
    assert.equal(ehMesmaOrigem(requisicaoFalsa({ 'sec-fetch-site': 'same-site' })), true);
  });

  it('compara o Origin com o Host quando não há Sec-Fetch-Site', () => {
    assert.equal(ehMesmaOrigem(requisicaoFalsa({ origin: 'http://painel:2000', host: 'painel:2000' })), true);
    assert.equal(ehMesmaOrigem(requisicaoFalsa({ origin: 'http://malicioso', host: 'painel:2000' })), false);
  });

  it('aceita clientes sem navegador (curl, Power BI), que não carregam credencial ambiente', () => {
    assert.equal(ehMesmaOrigem(requisicaoFalsa({ host: 'painel:2000' })), true);
  });
});

describe('interpretarPoliticaDeEmbutir', () => {
  it('libera para qualquer página com "*" — o padrão, por causa da TV', () => {
    const p = interpretarPoliticaDeEmbutir('*');
    assert.equal(p.frameAncestors, '*');
    assert.equal(p.bloquearIframe, false);
    assert.equal(p.recursoCruzado, 'cross-origin');
  });

  it('bloqueia com "nao" e variantes', () => {
    for (const valor of ['nao', 'não', 'false', 'no', '']) {
      const p = interpretarPoliticaDeEmbutir(valor);
      assert.equal(p.frameAncestors, "'none'", `falhou para "${valor}"`);
      assert.equal(p.bloquearIframe, true);
    }
  });

  it('aceita lista de origens e omite X-Frame-Options, que não sabe listar', () => {
    const p = interpretarPoliticaDeEmbutir('http://tv.empresa:8080, http://sinal.empresa');
    assert.equal(p.frameAncestors, "'self' http://tv.empresa:8080 http://sinal.empresa");
    assert.equal(p.bloquearIframe, false);
  });
});

describe('LimitadorDeChamadas', () => {
  it('bloqueia dentro da janela e libera depois', () => {
    const limitador = new LimitadorDeChamadas(10_000);
    assert.equal(limitador.permitir(1_000), true);
    assert.equal(limitador.permitir(5_000), false);
    assert.equal(limitador.permitir(11_000), true);
  });
});

describe('vazamento de informação do ERP', () => {
  it('a mensagem que chega à tela não carrega o corpo da resposta do ERP', () => {
    const corpo = '{"stack":"/opt/erp/src/PedidoDao.java:412","db":"consistem"}';
    const erro = ErroErp.deStatusHttp(500, corpo, true);

    assert.ok(!erro.message.includes('PedidoDao'), 'a stack do ERP não pode chegar ao navegador');
    assert.ok(!erro.message.includes('consistem'));
    assert.match(erro.message, /HTTP 500/);
    assert.equal(erro.corpo, corpo, 'o corpo continua disponível para o log do servidor');
  });

  it('distingue token ausente de token recusado sem expor o token', () => {
    assert.match(ErroErp.deStatusHttp(401, '', false).message, /ERP_TOKEN está vazio/);
    assert.match(ErroErp.deStatusHttp(401, '', true).message, /token recusado/);
  });
});
