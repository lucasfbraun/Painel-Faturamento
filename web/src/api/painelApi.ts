import type { Snapshot } from '../tipos';

const TEMPO_LIMITE_MS = 15_000;

export class ErroApi extends Error {
  constructor(mensagem: string, readonly status?: number) {
    super(mensagem);
    this.name = 'ErroApi';
  }
}

async function requisitar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(caminho, { ...init, cache: 'no-store', signal: controlador.signal });
    if (!resposta.ok) throw new ErroApi(`O servidor do painel respondeu ${resposta.status}`, resposta.status);
    return (await resposta.json()) as T;
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    throw new ErroApi('Não foi possível falar com o servidor do painel');
  } finally {
    clearTimeout(limite);
  }
}

/** Único ponto de contato da tela com o back-end. */
export const painelApi = {
  obterSnapshot: () => requisitar<Snapshot>('/api/dados'),
  solicitarAtualizacao: () => requisitar<{ iniciado: boolean }>('/api/atualizar', { method: 'POST' }),
};
