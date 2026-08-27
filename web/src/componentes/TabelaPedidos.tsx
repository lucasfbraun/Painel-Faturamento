import type { CSSProperties } from 'react';
import { classesDaLinha, corDaSituacao } from '../dominio/situacoes';
import type { ColunaOrdenavel, Ordenacao, Pedido } from '../tipos';
import { formatarData } from '../utils/formatadores';
import { IndicadorConferido } from './IndicadorConferido';
import { SeloSituacao } from './SeloSituacao';

interface Props {
  pedidos: readonly Pedido[];
  ordenacao: Ordenacao;
  aoOrdenarPor: (coluna: ColunaOrdenavel) => void;
}

const COLUNAS: { chave: ColunaOrdenavel; titulo: string }[] = [
  { chave: 'dataEmissao', titulo: 'Data emissão' },
  { chave: 'codPedido', titulo: 'Pedido' },
  { chave: 'codCliente', titulo: 'Cliente' },
  { chave: 'conferido', titulo: 'Conferência' },
];

const LIMITE_NOME_CLIENTE = 34;

function indicadorDeOrdem(ordenacao: Ordenacao, coluna: ColunaOrdenavel): string {
  if (ordenacao.coluna !== coluna) return '';
  return ordenacao.direcao === 1 ? ' ↑' : ' ↓';
}

export function TabelaPedidos({ pedidos, ordenacao, aoOrdenarPor }: Props) {
  return (
    <>
      <div className="tabela__moldura">
        <table>
          <thead>
            <tr>
              {COLUNAS.map(({ chave, titulo }) => (
                <th
                  key={chave}
                  onClick={() => aoOrdenarPor(chave)}
                  aria-sort={
                    ordenacao.coluna === chave ? (ordenacao.direcao === 1 ? 'ascending' : 'descending') : 'none'
                  }
                >
                  {titulo}
                  {indicadorDeOrdem(ordenacao, chave)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr
                key={pedido.codPedido}
                className={classesDaLinha(pedido)}
                style={{ '--cor-situacao': corDaSituacao(pedido.situacao) } as CSSProperties}
              >
                <td className="numero">{formatarData(pedido.dataEmissao)}</td>
                <td className="numero coluna-pedido">
                  <b>{pedido.codPedido}</b>
                </td>
                <td className="numero" title={pedido.nomeCliente}>
                  <span className="cliente__codigo">{pedido.codCliente}</span>
                  {pedido.nomeCliente && (
                    <span className="cliente__nome"> {pedido.nomeCliente.slice(0, LIMITE_NOME_CLIENTE)}</span>
                  )}
                </td>
                <td>
                  <SeloSituacao situacao={pedido.situacao} rotulo={pedido.situacaoNome} />
                </td>
                <td>
                  <IndicadorConferido valor={pedido.conferido} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pedidos.length === 0 && <p className="estado-vazio">Nenhum pedido para os filtros selecionados.</p>}
    </>
  );
}
