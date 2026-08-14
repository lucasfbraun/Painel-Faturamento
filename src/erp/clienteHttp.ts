import http from 'node:http';
import https from 'node:https';
import { ErroErp } from './erroErp.js';

export interface RespostaHttp {
  readonly corpo: unknown;
  readonly headers: Record<string, string | string[] | undefined>;
}

export interface OpcoesClienteHttp {
  readonly empresa: string;
  readonly token: string;
  readonly tlsInseguro: boolean;
  readonly timeoutMs: number;
}

/**
 * Cliente HTTP mínimo para a API do ERP.
 *
 * Usa `node:http`/`node:https` em vez de fetch porque precisamos desligar a
 * validação do certificado autoassinado do servidor on-premise por conexão.
 */
export class ClienteHttpErp {
  constructor(private readonly opcoes: OpcoesClienteHttp) {}

  async obterJson(url: URL): Promise<RespostaHttp> {
    const ehHttps = url.protocol === 'https:';
    const transporte = ehHttps ? https : http;

    return new Promise<RespostaHttp>((resolver, rejeitar) => {
      const requisicao = transporte.request(
        url,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
            empresa: this.opcoes.empresa,
            Authorization: this.opcoes.token,
          },
          timeout: this.opcoes.timeoutMs,
          ...(ehHttps && this.opcoes.tlsInseguro ? { rejectUnauthorized: false } : {}),
        },
        (resposta) => {
          const partes: Buffer[] = [];
          resposta.on('data', (parte: Buffer) => partes.push(parte));
          resposta.on('end', () => {
            const texto = Buffer.concat(partes).toString('utf8');
            const status = resposta.statusCode ?? 0;

            if (status < 200 || status >= 300) {
              return rejeitar(ErroErp.deStatusHttp(status, texto, Boolean(this.opcoes.token)));
            }
            try {
              resolver({ corpo: texto ? JSON.parse(texto) : null, headers: resposta.headers });
            } catch {
              rejeitar(new ErroErp('A resposta do ERP não é um JSON válido', status, texto));
            }
          });
        },
      );

      requisicao.on('timeout', () => {
        requisicao.destroy(new ErroErp(`Timeout de ${this.opcoes.timeoutMs}ms na API do ERP`));
      });
      requisicao.on('error', (erro) => {
        rejeitar(erro instanceof ErroErp ? erro : new ErroErp(`Falha de rede ao chamar o ERP: ${erro.message}`));
      });
      requisicao.end();
    });
  }
}
