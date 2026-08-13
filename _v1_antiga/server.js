/**
 * Painel de Faturamento — backend (proxy + poller da API do ERP)
 *
 * - Faz GET na API do ERP a cada POLL_INTERVALO_MIN minutos (padrão 5)
 * - Janela: dataDigitacaoInicio = hoje - DIAS_RETROATIVOS (padrão 60), dataDigitacaoFim = hoje
 * - Consulta anual extra (01/01 do ano corrente -> hoje) para os KPIs de ano/mês/dia
 * - Trata paginação via continuationToken e certificado autoassinado (TLS)
 * - Serve o dashboard estático e o snapshot em /api/dados
 *
 * Sem dependências externas: roda em node:20-alpine puro.
 */

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

// ---------------------------------------------------------------- config ---

const cfg = {
  porta: int(process.env.PORT, 2000),
  baseUrl: (process.env.ERP_BASE_URL || 'https://10.1.1.220').replace(/\/+$/, ''),
  caminho: process.env.ERP_PATH || '/api/comercial/v10/pedidoVenda',
  empresa: process.env.ERP_EMPRESA || '4',
  token: process.env.ERP_TOKEN || '',
  tlsInseguro: bool(process.env.ERP_TLS_INSECURE, true),
  timeoutMs: int(process.env.ERP_TIMEOUT_MS, 60000),
  paginacao: int(process.env.ERP_PAGINACAO, 200),
  maxPaginas: int(process.env.ERP_MAX_PAGINAS, 200),
  diasRetroativos: int(process.env.DIAS_RETROATIVOS, 60),
  pollMin: num(process.env.POLL_INTERVALO_MIN, 5),
  anoMin: num(process.env.ANO_INTERVALO_MIN, 5), // consulta anual a cada N min
  tz: process.env.TZ_PAINEL || 'America/Sao_Paulo',
  // Situações consideradas em cada agrupamento (ver README)
  sitFaturado: lista(process.env.SIT_FATURADO, [6]),
  sitAberto: lista(process.env.SIT_ABERTO, [0, 1, 2, 3, 4, 5, 8]),
  sitDisponivel: lista(process.env.SIT_DISPONIVEL, [2]),
  snapshotFile: process.env.SNAPSHOT_FILE || path.join(__dirname, 'data', 'snapshot.json'),
};

function int(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }
function num(v, d) { const n = parseFloat(v); return Number.isFinite(n) ? n : d; }
function bool(v, d) { if (v === undefined || v === '') return d; return /^(1|true|sim|yes|on)$/i.test(String(v)); }
function lista(v, d) {
  if (!v) return d;
  return String(v).split(/[,;\s]+/).map((x) => parseInt(x, 10)).filter(Number.isFinite);
}

const SITUACOES = {
  0: 'Digitado',
  1: 'Listado',
  2: 'Liberado',
  3: 'Selecionado Parcial',
  4: 'Selecionado Total',
  5: 'Faturado Parcial',
  6: 'Faturado Total',
  7: 'Transmitido',
  8: 'Bloqueado',
  9: 'Cancelado',
};

// ------------------------------------------------------------------ datas ---

/** Data "de hoje" no fuso do painel, como {ano, mes, dia, iso} */
function hoje() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: cfg.tz, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const iso = fmt.format(new Date()); // YYYY-MM-DD
  const [ano, mes, dia] = iso.split('-').map(Number);
  return { ano, mes, dia, iso };
}

/** iso (YYYY-MM-DD) menos N dias, sem depender do fuso local do container */
function menosDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(a, m - 1, d) - dias * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

// -------------------------------------------------------------- http ERP ---

function requisicao(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const mod = u.protocol === 'https:' ? https : http;
    const opts = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        empresa: cfg.empresa,
        Authorization: cfg.token,
      },
      timeout: cfg.timeoutMs,
    };
    if (u.protocol === 'https:' && cfg.tlsInseguro) opts.rejectUnauthorized = false;

    const req = mod.request(u, opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const corpo = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let dica = '';
          if (res.statusCode === 401 || res.statusCode === 403) {
            dica = cfg.token
              ? ' — token recusado pelo ERP (expirado ou sem permissão nesta empresa). Confira ERP_TOKEN e ERP_EMPRESA no .env.'
              : ' — ERP_TOKEN está vazio no .env.';
          }
          return reject(new Error(`HTTP ${res.statusCode} do ERP: ${corpo.slice(0, 400)}${dica}`));
        }
        try {
          resolve({ json: corpo ? JSON.parse(corpo) : null, headers: res.headers });
        } catch (e) {
          reject(new Error(`Resposta do ERP não é JSON válido: ${corpo.slice(0, 200)}`));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout de ${cfg.timeoutMs}ms na API do ERP`)));
    req.on('error', reject);
    req.end();
  });
}

/** A API pode devolver o array direto ou embrulhado — cobrimos os formatos usuais. */
function extrairPedidos(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  for (const k of ['pedidos', 'pedidoVenda', 'pedidosVenda', 'data', 'itens', 'items', 'content', 'result', 'registros', 'lista']) {
    if (Array.isArray(json[k])) return json[k];
  }
  // último recurso: primeiro array de objetos encontrado no primeiro nível
  for (const v of Object.values(json)) {
    if (Array.isArray(v) && (v.length === 0 || typeof v[0] === 'object')) return v;
  }
  return [];
}

function extrairToken(json, headers) {
  const cand = [
    json && (json.continuationToken || json.ContinuationToken || json.proximaPagina || json.nextToken || json.next),
    headers && (headers.continuationtoken || headers['x-continuation-token']),
  ];
  for (const c of cand) if (c && String(c).trim() && String(c) !== 'null') return String(c);
  return null;
}

/** Busca todos os pedidos de uma janela, seguindo o continuationToken. */
async function buscarJanela({ inicio, fim }) {
  const pedidos = [];
  let token = null;
  let paginas = 0;

  do {
    const u = new URL(cfg.baseUrl + cfg.caminho);
    u.searchParams.set('dataDigitacaoInicio', inicio);
    u.searchParams.set('dataDigitacaoFim', fim);
    if (cfg.paginacao > 0) u.searchParams.set('paginacao', String(cfg.paginacao));
    if (token) u.searchParams.set('continuationToken', token);

    const { json, headers } = await requisicao(u.toString());
    const lote = extrairPedidos(json);
    pedidos.push(...lote);
    token = extrairToken(json, headers);
    paginas += 1;
    if (lote.length === 0) break;
  } while (token && paginas < cfg.maxPaginas);

  return { pedidos, paginas };
}

// -------------------------------------------------------- normalização ---

function customizado(pedido, campo) {
  const arr = pedido && pedido.dadosCustomizados;
  if (!Array.isArray(arr)) return '';
  const achou = arr.find((d) => d && d.campo === campo);
  return achou && achou.valor !== undefined && achou.valor !== null ? String(achou.valor) : '';
}

function conferidoDe(pedido) {
  const direto = customizado(pedido, 'conferido').trim();
  if (direto) {
    if (/^(s|sim|1|true)$/i.test(direto)) return 'Sim';
    if (/^(n|nao|não|0|false)$/i.test(direto)) return 'Não';
    return direto;
  }
  const flag = customizado(pedido, 'pedidoConferido').trim();
  if (flag === '1') return 'Sim';
  if (flag === '0') return 'Não';
  return 'Não';
}

function normalizar(p) {
  const sit = parseInt(p.situacao, 10);
  return {
    codPedido: String(p.codPedido ?? ''),
    codCliente: p.codCliente ?? '',
    nomeCliente: customizado(p, 'nomeCliente') || p.nomeLocalEntrega || '',
    dataEmissao: p.dataEmissao || '',
    dataPrevFat: p.dataPrevFat || '',
    situacao: Number.isFinite(sit) ? sit : null,
    situacaoNome: SITUACOES[sit] ?? `Situação ${p.situacao ?? '?'}`,
    conferido: conferidoDe(p),
    dataInclusao: customizado(p, 'dataHoraInclusao'),
    tipoNota: customizado(p, 'nomeTipoNota'),
    representante: p.codRepresentante ?? '',
    qtdItens: Array.isArray(p.itensPedido) ? p.itensPedido.length : 0,
  };
}

// ------------------------------------------------------------------ KPIs ---

function contarPor(pedidos, situacoes) {
  const set = new Set(situacoes);
  return pedidos.filter((p) => set.has(p.situacao)).length;
}

function calcularKpis(janela, ano, ref) {
  const setFat = new Set(cfg.sitFaturado);
  const fat = ano.filter((p) => setFat.has(p.situacao) && p.dataEmissao);
  const prefixoAno = String(ref.ano);
  const prefixoMes = `${ref.ano}-${String(ref.mes).padStart(2, '0')}`;

  return {
    faturadosAno: fat.filter((p) => p.dataEmissao.startsWith(prefixoAno)).length,
    faturadosMes: fat.filter((p) => p.dataEmissao.startsWith(prefixoMes)).length,
    faturadosDia: fat.filter((p) => p.dataEmissao === ref.iso).length,
    emAberto: contarPor(janela, cfg.sitAberto),
    disponiveisFaturar: contarPor(janela, cfg.sitDisponivel),
  };
}

// ----------------------------------------------------------------- estado ---

let snapshot = {
  atualizadoEm: null,
  proximaAtualizacao: null,
  ok: false,
  erro: null,
  janela: { inicio: null, fim: null, dias: cfg.diasRetroativos },
  kpis: { faturadosAno: 0, faturadosMes: 0, faturadosDia: 0, emAberto: 0, disponiveisFaturar: 0 },
  porSituacao: {},
  pedidos: [],
  meta: {
    empresa: cfg.empresa,
    intervaloMin: cfg.pollMin,
    situacoes: SITUACOES,
    sitFaturado: cfg.sitFaturado,
    sitAberto: cfg.sitAberto,
    sitDisponivel: cfg.sitDisponivel,
    anoConsultadoEm: null,
  },
};

let cacheAno = { pedidos: [], em: 0 };
let atualizando = false;

function carregarSnapshotSalvo() {
  try {
    if (fs.existsSync(cfg.snapshotFile)) {
      const s = JSON.parse(fs.readFileSync(cfg.snapshotFile, 'utf8'));
      if (s && s.pedidos) { snapshot = { ...snapshot, ...s, meta: { ...snapshot.meta, ...(s.meta || {}) } }; log('snapshot anterior carregado do disco'); }
    }
  } catch (e) { log('não foi possível carregar o snapshot salvo:', e.message); }
}

function salvarSnapshot() {
  try {
    fs.mkdirSync(path.dirname(cfg.snapshotFile), { recursive: true });
    fs.writeFileSync(cfg.snapshotFile, JSON.stringify(snapshot));
  } catch (e) { log('não foi possível salvar o snapshot:', e.message); }
}

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

async function atualizar() {
  if (atualizando) { log('ciclo anterior ainda em execução — pulando'); return; }
  atualizando = true;
  const t0 = Date.now();
  const ref = hoje();
  const fim = ref.iso;
  const inicio = menosDias(fim, cfg.diasRetroativos);

  try {
    log(`consultando janela ${inicio} .. ${fim} (empresa ${cfg.empresa})`);
    const { pedidos: brutos, paginas } = await buscarJanela({ inicio, fim });
    const janela = brutos.map(normalizar);

    // Consulta anual (para os KPIs de ano/mês/dia), com cache próprio
    const precisaAno = Date.now() - cacheAno.em >= cfg.anoMin * 60000 || cacheAno.pedidos.length === 0;
    if (precisaAno) {
      const inicioAno = `${ref.ano}-01-01`;
      log(`consultando ano ${inicioAno} .. ${fim}`);
      const r = await buscarJanela({ inicio: inicioAno, fim });
      cacheAno = { pedidos: r.pedidos.map(normalizar), em: Date.now() };
      snapshot.meta.anoConsultadoEm = new Date().toISOString();
    }

    const porSituacao = {};
    for (const p of janela) {
      const k = p.situacao === null ? 'null' : String(p.situacao);
      porSituacao[k] = (porSituacao[k] || 0) + 1;
    }

    snapshot = {
      ...snapshot,
      atualizadoEm: new Date().toISOString(),
      proximaAtualizacao: new Date(Date.now() + cfg.pollMin * 60000).toISOString(),
      ok: true,
      erro: null,
      janela: { inicio, fim, dias: cfg.diasRetroativos },
      kpis: calcularKpis(janela, cacheAno.pedidos, ref),
      porSituacao,
      pedidos: janela,
      meta: { ...snapshot.meta, paginas, totalAno: cacheAno.pedidos.length },
    };
    salvarSnapshot();
    log(`ok — ${janela.length} pedidos na janela, ${cacheAno.pedidos.length} no ano (${Date.now() - t0}ms)`);
  } catch (e) {
    snapshot.ok = false;
    snapshot.erro = e.message;
    snapshot.proximaAtualizacao = new Date(Date.now() + cfg.pollMin * 60000).toISOString();
    log('ERRO no ciclo:', e.message);
  } finally {
    atualizando = false;
  }
}

// ------------------------------------------------------------------- HTTP ---

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8' };

const servidor = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://local');

  if (u.pathname === '/api/dados') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(JSON.stringify(snapshot));
  }

  if (u.pathname === '/api/health') {
    res.writeHead(snapshot.ok ? 200 : 503, { 'content-type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: snapshot.ok, atualizadoEm: snapshot.atualizadoEm, erro: snapshot.erro }));
  }

  if (u.pathname === '/api/atualizar' && req.method === 'POST') {
    atualizar();
    res.writeHead(202, { 'content-type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ iniciado: true }));
  }

  // estáticos
  const rel = u.pathname === '/' ? '/index.html' : u.pathname;
  const arquivo = path.join(__dirname, 'public', path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(arquivo, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(arquivo)] || 'application/octet-stream' });
    res.end(buf);
  });
});

carregarSnapshotSalvo();
servidor.listen(cfg.porta, () => {
  log(`Painel de Faturamento em http://localhost:${cfg.porta}`);
  log(`ERP: ${cfg.baseUrl}${cfg.caminho} | empresa ${cfg.empresa} | janela ${cfg.diasRetroativos} dias | ciclo ${cfg.pollMin} min`);
  if (!cfg.token) log('ATENÇÃO: ERP_TOKEN vazio — configure no .env');
  atualizar();
  setInterval(atualizar, Math.max(1, cfg.pollMin) * 60000);
});
