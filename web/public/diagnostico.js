/*
 * Rede de segurança para telas onde não existe console: televisor, totem, TV box.
 *
 * Escrito em JavaScript antigo e carregado como script clássico — roda mesmo nos
 * navegadores que não conseguem executar o bundle. Fica calado enquanto tudo vai
 * bem; se passados alguns segundos a aplicação não tiver montado nada, escreve na
 * própria tela o motivo: o erro capturado, o endereço e a identificação do
 * navegador. É o que permite diagnosticar o aparelho sem ir até ele.
 */
(function () {
  var ESPERA_MS = 8000;
  var erros = [];

  window.addEventListener('error', function (evento) {
    if (evento.message) erros.push(evento.message + (evento.filename ? ' (' + evento.filename + ')' : ''));
    else if (evento.target && evento.target.src) erros.push('não carregou: ' + evento.target.src);
  }, true);

  window.addEventListener('unhandledrejection', function (evento) {
    erros.push('promessa rejeitada: ' + (evento.reason && evento.reason.message ? evento.reason.message : evento.reason));
  });

  function escapar(texto) {
    return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function relatar() {
    var raiz = document.getElementById('raiz');
    if (!raiz || raiz.children.length > 0) return; // montou: nada a fazer

    var listaErros = erros.length
      ? '<ul style="margin:0;padding-left:20px">' +
        erros.map(function (e) { return '<li style="margin-bottom:6px">' + escapar(e) + '</li>'; }).join('') +
        '</ul>'
      : '<p style="color:#7a8fa6;margin:0">Nenhum erro capturado — provavelmente o navegador nem chegou a ' +
        'executar o programa da tela.</p>';

    raiz.innerHTML =
      '<div style="font:15px system-ui,Arial,sans-serif;color:#2d3a4a;padding:32px 24px;max-width:820px;margin:0 auto">' +
      '<h1 style="color:#0c3b38;font-size:22px;margin:0 0 6px">A tela não carregou</h1>' +
      '<p style="color:#7a8fa6;margin:0 0 22px">O servidor respondeu, mas o painel não conseguiu montar neste ' +
      'navegador. Envie esta tela ao TI.</p>' +
      '<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#7a8fa6;margin:0 0 8px">Erros</h2>' +
      '<div style="background:#fff;border:1px solid #dde5ee;border-left:4px solid #e06c75;border-radius:10px;' +
      'padding:14px 16px;margin-bottom:20px;font-size:14px">' + listaErros + '</div>' +
      '<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#7a8fa6;margin:0 0 8px">Navegador</h2>' +
      '<p style="word-break:break-all;background:#f0f4f8;padding:12px;border-radius:8px;font-family:monospace;' +
      'font-size:12px;margin:0 0 8px">' + escapar(navigator.userAgent) + '</p>' +
      '<p style="color:#7a8fa6;font-size:13px;margin:0 0 22px">Endereço: ' + escapar(location.href) +
      ' · Janela: ' + window.innerWidth + '×' + window.innerHeight + '</p>' +
      '<p style="margin:0"><b>Próximo passo:</b> abra <b>' + escapar(location.origin) + '/compat.html</b> ' +
      'neste mesmo aparelho — a página lista quais recursos faltam.</p>' +
      '</div>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(relatar, ESPERA_MS); });
  } else {
    setTimeout(relatar, ESPERA_MS);
  }
})();
