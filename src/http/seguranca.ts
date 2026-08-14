import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Cabeçalhos de segurança aplicados a toda resposta.
 *
 * O painel é somente leitura e roda na rede interna, mas o navegador é um
 * ambiente hostil por natureza: basta uma aba maliciosa aberta na mesma máquina
 * para tentar embutir ou raspar a tela.
 *
 * A CSP é restritiva porque o bundle não precisa de nada externo: scripts,
 * estilos e fontes vêm do próprio servidor, e não há conexão para fora.
 * `style-src` precisa de 'unsafe-inline' por causa dos estilos inline que os
 * gráficos usam para posicionar barras e cores — são valores calculados, nunca
 * texto vindo do ERP.
 */

const NEGADO = new Set(['nao', 'não', 'no', 'false', '0', 'off', 'deny', 'nenhum']);

export interface PoliticaDeEmbutir {
  /** Valor da diretiva `frame-ancestors`. */
  readonly frameAncestors: string;
  /** Se o `X-Frame-Options: DENY` deve ser enviado. */
  readonly bloquearIframe: boolean;
  /** Valor de `Cross-Origin-Resource-Policy`. */
  readonly recursoCruzado: 'same-origin' | 'cross-origin';
}

/**
 * Traduz `PERMITIR_EMBUTIR` em política de exibição em iframe.
 *
 * O padrão é permitir: este painel existe para rodar em televisor corporativo, e
 * esse tipo de software carrega a URL dentro de um iframe. Bloquear por padrão
 * deixaria o caso de uso principal quebrado — foi exatamente o que aconteceu na
 * v4.0. Quem não usa TV pode fechar com `PERMITIR_EMBUTIR=nao`.
 *
 * `X-Frame-Options` não tem forma de listar origens (o antigo `ALLOW-FROM` foi
 * abandonado), então quando há qualquer permissão ele é omitido e a decisão fica
 * inteira com `frame-ancestors`, que os navegadores atuais respeitam.
 */
export function interpretarPoliticaDeEmbutir(valor: string): PoliticaDeEmbutir {
  const limpo = valor.trim();

  if (!limpo || NEGADO.has(limpo.toLowerCase())) {
    return { frameAncestors: "'none'", bloquearIframe: true, recursoCruzado: 'same-origin' };
  }
  if (limpo === '*') {
    return { frameAncestors: '*', bloquearIframe: false, recursoCruzado: 'cross-origin' };
  }
  const origens = limpo.split(/[\s,;]+/).filter(Boolean).join(' ');
  return { frameAncestors: `'self' ${origens}`, bloquearIframe: false, recursoCruzado: 'cross-origin' };
}

function montarCsp(politica: PoliticaDeEmbutir): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    `frame-ancestors ${politica.frameAncestors}`,
  ].join('; ');
}

export function criarAplicadorDeCabecalhos(embutirPermitido: string) {
  const politica = interpretarPoliticaDeEmbutir(embutirPermitido);

  const cabecalhos: Record<string, string> = {
    'content-security-policy': montarCsp(politica),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
    'cross-origin-resource-policy': politica.recursoCruzado,
  };
  if (politica.bloquearIframe) cabecalhos['x-frame-options'] = 'DENY';

  return function aplicar(res: ServerResponse): void {
    for (const [nome, valor] of Object.entries(cabecalhos)) res.setHeader(nome, valor);
  };
}

/**
 * Aceita a requisição apenas se ela nasceu da própria página.
 *
 * Sem isso, qualquer site aberto no navegador de quem tem acesso ao painel
 * poderia disparar `POST /api/atualizar` por um formulário — o efeito é só uma
 * consulta extra ao ERP, mas é carga não solicitada e não custa nada barrar.
 * Requisições sem `Origin` nem `Sec-Fetch-Site` (curl, Power BI, um script) são
 * aceitas: não vêm de navegador e, portanto, não carregam credencial ambiente.
 *
 * `same-site` entra junto com `same-origin` porque, dentro de um iframe de
 * software de TV, é assim que o navegador classifica a requisição da própria
 * página quando o topo tem outra origem.
 */
export function ehMesmaOrigem(req: IncomingMessage): boolean {
  const site = req.headers['sec-fetch-site'];
  if (typeof site === 'string') return site === 'same-origin' || site === 'same-site' || site === 'none';

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
