/*
 * Executado apenas por navegadores SEM suporte a módulos ES (anteriores ao
 * Chrome 61). O painel não roda neles — sem esta mensagem, a tela ficaria
 * simplesmente preta e ninguém saberia por quê.
 */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var raiz = document.getElementById('raiz');
    if (!raiz) return;
    raiz.innerHTML =
      '<div style="font:16px system-ui,Arial,sans-serif;color:#2d3a4a;padding:40px;max-width:640px;margin:0 auto">' +
      '<h1 style="color:#0c3b38;font-size:22px;margin:0 0 12px">Navegador não compatível</h1>' +
      '<p>Este navegador é antigo demais para o painel (não tem suporte a módulos JavaScript).</p>' +
      '<p style="margin-top:16px">Abra <b>/compat.html</b> neste mesmo endereço e envie o resultado ao TI — ' +
      'ele diz exatamente qual recurso está faltando.</p>' +
      '</div>';
  });
})();
