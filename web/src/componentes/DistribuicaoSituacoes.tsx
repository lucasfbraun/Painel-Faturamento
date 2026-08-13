import { corDaSituacao } from '../dominio/situacoes';
import { Marcador } from './Marcador';

export interface FatiaSituacao {
  codigo: number;
  rotulo: string;
  quantidade: number;
}

interface Props {
  fatias: readonly FatiaSituacao[];
}

/**
 * Barra empilhada da janela consultada.
 *
 * Cada segmento tem legenda com rótulo e número, e tooltip com o percentual —
 * a cor é reforço visual, não o único canal de informação.
 */
export function DistribuicaoSituacoes({ fatias }: Props) {
  const total = fatias.reduce((soma, fatia) => soma + fatia.quantidade, 0);
  if (total === 0) return null;

  return (
    <section className="cartao" aria-label="Distribuição por situação">
      <h2>Pedidos por situação</h2>
      <div className="distribuicao__barra">
        {fatias.map((fatia) => (
          <div
            key={fatia.codigo}
            className="distribuicao__segmento"
            style={{ flex: fatia.quantidade, background: corDaSituacao(fatia.codigo) }}
            title={`${fatia.rotulo}: ${fatia.quantidade} pedidos (${Math.round((fatia.quantidade / total) * 100)}%)`}
          />
        ))}
      </div>
      <div className="distribuicao__legenda">
        {fatias.map((fatia) => (
          <span key={fatia.codigo} className="distribuicao__item">
            <Marcador cor={corDaSituacao(fatia.codigo)} />
            {fatia.rotulo} <b>{fatia.quantidade}</b>
          </span>
        ))}
      </div>
    </section>
  );
}
