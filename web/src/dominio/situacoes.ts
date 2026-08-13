import { Situacao, type Pedido } from '../tipos';

/**
 * Cor de cada situação, em variáveis CSS definidas em `estilos/tokens.css`.
 *
 * A paleta segue a identidade visual do Grupo Flexível e foi validada para
 * daltonismo (protanopia/deuteranopia/tritanopia) nos temas claro e escuro.
 * A cor nunca é o único sinal: todo selo carrega o rótulo em texto.
 */
export const VARIAVEL_COR_SITUACAO: Readonly<Record<number, string>> = {
  [Situacao.Digitado]: '--situacao-digitado',
  [Situacao.Listado]: '--situacao-listado',
  [Situacao.Liberado]: '--situacao-liberado',
  [Situacao.SelecionadoParcial]: '--situacao-sel-parcial',
  [Situacao.SelecionadoTotal]: '--situacao-sel-total',
  [Situacao.FaturadoParcial]: '--situacao-fat-parcial',
  [Situacao.FaturadoTotal]: '--situacao-fat-total',
  [Situacao.Transmitido]: '--situacao-transmitido',
  [Situacao.Bloqueado]: '--situacao-bloqueado',
  [Situacao.Cancelado]: '--situacao-cancelado',
};

export function corDaSituacao(situacao: number | null): string {
  const variavel = situacao === null ? undefined : VARIAVEL_COR_SITUACAO[situacao];
  return `var(${variavel ?? '--situacao-digitado'})`;
}

/**
 * Classes de realce da linha.
 *
 * São dois canais independentes, para não disputarem a mesma pista visual:
 *   • fundo verde  → pedido conferido
 *   • faixa lateral → situação do pedido (`corDaSituacao`)
 *
 * Bloqueado tinge o fundo de vermelho apenas quando o pedido não está
 * conferido — "conferido" é a informação que o usuário procura primeiro.
 */
export function classesDaLinha(pedido: Pedido): string {
  const classes: string[] = [];
  if (pedido.conferido === 'Sim') classes.push('linha--conferida');
  if (pedido.situacao === Situacao.Bloqueado) classes.push('linha--bloqueada');
  return classes.join(' ');
}
