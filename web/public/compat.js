/*
 * Diagnóstico de compatibilidade — ES5 puro, sem dependência nenhuma, para
 * rodar até no navegador mais velho. Diz qual recurso falta quando o painel
 * não abre no televisor.
 */
(function () {
  function existe(fn) {
    try { return !!fn(); } catch (e) { return false; }
  }

  var testes = [
    { nome: 'Módulos ES (type=module)', ok: existe(function () { return 'noModule' in document.createElement('script'); }), critico: true },
    { nome: 'fetch', ok: existe(function () { return window.fetch; }), critico: true },
    { nome: 'Promise', ok: existe(function () { return window.Promise; }), critico: true },
    { nome: 'CSS Grid', ok: existe(function () { return CSS.supports('display', 'grid'); }), critico: true },
    { nome: 'Variáveis CSS', ok: existe(function () { return CSS.supports('--x', '0'); }), critico: true },
    { nome: 'SVG inline', ok: existe(function () { return !!document.createElementNS; }), critico: true },
    { nome: 'gap em flexbox', ok: existe(function () { return CSS.supports('gap', '1px'); }), critico: false },
    { nome: 'ResizeObserver', ok: existe(function () { return window.ResizeObserver; }), critico: false },
    { nome: 'AbortController', ok: existe(function () { return window.AbortController; }), critico: false },
    { nome: 'Object.assign', ok: existe(function () { return Object.assign; }), critico: true },
    { nome: 'Array.from', ok: existe(function () { return Array.from; }), critico: true },
    { nome: 'Map / Set', ok: existe(function () { return window.Map && window.Set; }), critico: true },
    { nome: 'toLocaleString com opções', ok: existe(function () { return (1234.5).toLocaleString('pt-BR') !== '1234.5'; }), critico: false },
    { nome: 'seletor :not()', ok: existe(function () { return CSS.supports('selector(:not(a))'); }), critico: false }
  ];

  var faltando = [];
  var linhas = '';
  for (var i = 0; i < testes.length; i++) {
    var t = testes[i];
    if (!t.ok) faltando.push(t.nome + (t.critico ? ' (crítico)' : ''));
    linhas +=
      '<tr><td>' + t.nome + '</td>' +
      '<td style="text-align:center;font-weight:700;color:' + (t.ok ? '#0f7c70' : '#e06c75') + '">' +
      (t.ok ? 'OK' : 'FALTA') + '</td>' +
      '<td style="color:#7a8fa6">' + (t.critico ? 'necessário' : 'opcional') + '</td></tr>';
  }

  var veredito = faltando.length === 0
    ? '<p style="color:#0f7c70;font-weight:700">Este navegador tem tudo o que o painel precisa.</p>'
    : '<p style="color:#e06c75;font-weight:700">Faltando: ' + faltando.join(', ') + '</p>';

  document.getElementById('saida').innerHTML =
    veredito +
    '<h2 style="font-size:14px;margin:20px 0 6px">Identificação do navegador</h2>' +
    '<p style="word-break:break-all;background:#f0f4f8;padding:10px;border-radius:8px;font-family:monospace;font-size:12px">' +
    navigator.userAgent + '</p>' +
    '<p style="color:#7a8fa6;font-size:13px">Tela: ' + screen.width + '×' + screen.height +
    ' · Janela: ' + window.innerWidth + '×' + window.innerHeight + '</p>' +
    '<h2 style="font-size:14px;margin:20px 0 6px">Recursos</h2>' +
    '<table style="border-collapse:collapse;width:100%;font-size:14px">' +
    '<tr style="text-align:left;color:#7a8fa6;font-size:12px"><th>Recurso</th><th>Situação</th><th>Tipo</th></tr>' +
    linhas + '</table>';
})();
