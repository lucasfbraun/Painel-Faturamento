export type NivelLog = 'info' | 'aviso' | 'erro';

export interface Logger {
  info(mensagem: string, ...detalhes: unknown[]): void;
  aviso(mensagem: string, ...detalhes: unknown[]): void;
  erro(mensagem: string, ...detalhes: unknown[]): void;
  comContexto(contexto: string): Logger;
}

const PREFIXO: Record<NivelLog, string> = { info: 'INFO ', aviso: 'AVISO', erro: 'ERRO ' };

function escrever(nivel: NivelLog, contexto: string, mensagem: string, detalhes: unknown[]): void {
  const linha = `[${new Date().toISOString()}] ${PREFIXO[nivel]} ${contexto ? `(${contexto}) ` : ''}${mensagem}`;
  if (nivel === 'erro') console.error(linha, ...detalhes);
  else console.log(linha, ...detalhes);
}

export function criarLogger(contexto = ''): Logger {
  return {
    info: (m, ...d) => escrever('info', contexto, m, d),
    aviso: (m, ...d) => escrever('aviso', contexto, m, d),
    erro: (m, ...d) => escrever('erro', contexto, m, d),
    comContexto: (novo) => criarLogger(contexto ? `${contexto}:${novo}` : novo),
  };
}

/** Logger silencioso — usado nos testes. */
export const loggerMudo: Logger = {
  info: () => {},
  aviso: () => {},
  erro: () => {},
  comContexto: () => loggerMudo,
};
