import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Cabeçalhos de segurança aplicados a toda resposta.
 *
 * O painel é somente leitura e roda na rede interna, mas o navegador é um
 * ambiente hostil por natureza: basta uma aba maliciosa aberta na mesma máquina
 * para tentar enquadrar, embutir ou raspar a tela.
 *
 * A CSP é restritiva porque o bundle do Vite não precisa de nada externo:
 * scripts e estilos vêm do próprio servidor, e não há conexão para fora.
 * `style-src` precisa de 'unsafe-inline' por causa dos estilos inline que os
 * gráficos usam para posicionar barras e cores — são valores calculados, nunca
 * texto vindo do ERP.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const CABECALHOS: Readonly<Record<string, string>> = {
  'content-security-policy': CSP,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
};

export function aplicarCabecalhosDeSeguranca(res: ServerResponse): void {
  for (const [nome, valor] of Object.entries(CABECALHOS)) res.setHeader(nome, valor);
}

/**
 * Aceita a requisição apenas se ela nasceu da própria página.
 *
 * Sem isso, qualquer site aberto no navegador de quem tem acesso ao painel
 * poderia disparar `POST /api/atualizar` por um formulário — o efeito é só uma
 * consulta extra ao ERP, mas é carga não solicitada e não custa nada barrar.
 * Requisições sem `Origin` nem `Sec-Fetch-Site` (curl, Power BI, um script) são
 * aceitas: não vêm de navegador e, portanto, não carregam credencial ambiente.
 */
export function ehMesmaOrigem(req: IncomingMessage): boolean {
  const site = req.headers['sec-fetch-site'];
  if (typeof site === 'string') return site === 'same-origin' || site === 'none';

  const origem = req.headers.origin;
  if (typeof origem !== 'string') return true;

  const host = req.headers.host;
  try {
    return new URL(origem).host === host;
  } catch {
    return false;
  }
}

/**
 * Limitador simples por janela de tempo, para as rotas que disparam trabalho.
 *
 * Não é proteção contra ataque distribuído — é uma trava para que um botão
 * preso ou um script em laço não transformem o painel em um gerador de carga
 * contra o ERP.
 */
export class LimitadorDeChamadas {
  // -Infinity e não 0: com 0, a primeira chamada seria comparada contra a época
  // Unix e o limitador se comportaria de forma diferente em relógio simulado.
  private ultimaChamada = Number.NEGATIVE_INFINITY;

  constructor(private readonly intervaloMs: number) {}

  permitir(agora = Date.now()): boolean {
    if (agora - this.ultimaChamada < this.intervaloMs) return false;
    this.ultimaChamada = agora;
    return true;
  }
}
