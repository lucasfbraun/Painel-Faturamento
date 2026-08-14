/**
 * Erro de comunicação com o ERP, com dica de causa provável quando dá para inferir.
 *
 * A `message` é o que chega à tela e ao `/api/dados`: leva o status e a dica, mas
 * **não** o corpo da resposta do ERP, que pode conter caminhos internos, nomes de
 * tabela ou trechos de stack trace. O corpo fica em `corpo`, registrado só no log
 * do servidor, onde quem tem acesso já tem acesso a tudo.
 */
export class ErroErp extends Error {
  constructor(
    mensagem: string,
    readonly status?: number,
    readonly corpo?: string,
  ) {
    super(mensagem);
    this.name = 'ErroErp';
  }

  static deStatusHttp(status: number, corpo: string, temToken: boolean): ErroErp {
    let dica = '';
    if (status === 401 || status === 403) {
      dica = temToken
        ? ' — token recusado pelo ERP (expirado ou sem permissão nesta empresa). Confira ERP_TOKEN e ERP_EMPRESA no .env.'
        : ' — ERP_TOKEN está vazio no .env.';
    } else if (status === 404) {
      dica = ' — verifique ERP_PATH no .env.';
    } else if (status >= 500) {
      dica = ' — falha no lado do ERP; o painel tentará de novo no próximo ciclo.';
    } else if (status >= 400) {
      dica = ' — requisição recusada; confira os parâmetros no .env.';
    }
    return new ErroErp(`O ERP respondeu HTTP ${status}${dica}`, status, corpo);
  }
}
