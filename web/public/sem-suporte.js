/*
 * Executado por navegadores SEM suporte a módulos ES (anteriores ao Chrome 61).
 *
 * CUIDADO: vários navegadores WebKit — inclusive os de televisor derivados do
 * Safari 10.1 — têm um defeito conhecido e executam o script `nomodule` MESMO
 * suportando módulos. Por isso este arquivo nunca escreve na tela às cegas: só
 * age se, passado um tempo, a aplicação realmente não tiver montado nada.
 * Sem essa checagem, ele apagaria um painel que estava funcionando.
 */
(function () {
  var ESPERA_MS = 2500;

  function aplicarSeVazio() {
    var raiz = document.getElementById('raiz');
    if (!raiz || raiz.children.length > 0) return; // a aplicação montou: não mexer

    raiz.innerHTML =
      '<div style="font:16px system-ui,Arial,sans-serif;color:#2d3a4a;padding:40px;max-width:680px;margin:0 auto">' +
      '<h1 style="color:#0c3b38;font-size:22px;margin:0 0 12px">Navegador não compatível</h1>' +
      '<p>Este navegador não tem suporte a módulos JavaScript, recurso que o painel exige ' +
      '(disponível a partir do Chrome 61).</p>' +
      '<p style="margin-top:16px">Abra <b>/compat.html</b> neste mesmo endereço e envie o resultado ' +
      'ao TI — a página diz exatamente qual recurso está faltando.</p>' +
      '</div>';
  }

  function agendar() {
    setTimeout(aplicarSeVazio, ESPERA_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', agendar);
  else agendar();
})();
