/** Erro de comunicação com o ERP, com dica de causa provável quando dá para inferir. */
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
    const trecho = corpo.slice(0, 400);
    let dica = '';
    if (status === 401 || status === 403) {
      dica = temToken
        ? ' — token recusado pelo ERP (expirado ou sem permissão nesta empresa). Confira ERP_TOKEN e ERP_EMPRESA no .env.'
        : ' — ERP_TOKEN está vazio no .env.';
    } else if (status === 404) {
      dica = ' — verifique ERP_PATH no .env.';
    } else if (status >= 500) {
      dica = ' — falha no lado do ERP; o painel tentará de novo no próximo ciclo.';
    }
    return new ErroErp(`HTTP ${status} do ERP: ${trecho}${dica}`, status, corpo);
  }
}
