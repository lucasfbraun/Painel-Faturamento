/**
 * Leitura tolerante da resposta do ERP.
 *
 * A API pode devolver o array de pedidos solto ou embrulhado em uma chave, e o
 * token de paginação pode vir no corpo ou em um header. Em vez de amarrar o
 * painel a um formato só, reconhecemos os formatos usuais.
 */

export type CorpoDesconhecido = unknown;

const CHAVES_DE_LISTA = [
  'pedidos',
  'pedidoVenda',
  'pedidosVenda',
  'data',
  'itens',
  'items',
  'content',
  'result',
  'registros',
  'lista',
] as const;

const CHAVES_DE_TOKEN = [
  'continuationToken',
  'ContinuationToken',
  'proximaPagina',
  'nextToken',
  'next',
] as const;

const HEADERS_DE_TOKEN = ['continuationtoken', 'x-continuation-token'] as const;

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function ehListaDeRegistros(valor: unknown): valor is Record<string, unknown>[] {
  return Array.isArray(valor) && (valor.length === 0 || ehObjeto(valor[0]));
}

/** Extrai a lista de pedidos brutos de qualquer um dos formatos conhecidos. */
export function extrairPedidos(corpo: CorpoDesconhecido): Record<string, unknown>[] {
  if (ehListaDeRegistros(corpo)) return corpo;
  if (!ehObjeto(corpo)) return [];

  for (const chave of CHAVES_DE_LISTA) {
    const valor = corpo[chave];
    if (ehListaDeRegistros(valor)) return valor;
  }
  // Último recurso: o primeiro array de objetos do primeiro nível.
  for (const valor of Object.values(corpo)) {
    if (ehListaDeRegistros(valor)) return valor;
  }
  return [];
}

/** Extrai o continuationToken do corpo ou dos headers; null quando acabou a paginação. */
export function extrairContinuationToken(
  corpo: CorpoDesconhecido,
  headers: Record<string, string | string[] | undefined> = {},
): string | null {
  const candidatos: unknown[] = [];

  if (ehObjeto(corpo)) {
    for (const chave of CHAVES_DE_TOKEN) candidatos.push(corpo[chave]);
  }
  for (const chave of HEADERS_DE_TOKEN) candidatos.push(headers[chave]);

  for (const candidato of candidatos) {
    const valor = Array.isArray(candidato) ? candidato[0] : candidato;
    if (typeof valor !== 'string' && typeof valor !== 'number') continue;
    const texto = String(valor).trim();
    if (texto && texto !== 'null' && texto !== 'undefined') return texto;
  }
  return null;
}
