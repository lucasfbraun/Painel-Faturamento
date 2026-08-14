import { corDaSituacao } from '../dominio/situacoes';

export interface FatiaSituacao {
  codigo: number;
  rotulo: string;
  quantidade: number;
}

interface Props {
  fatias: readonly FatiaSituacao[];
}

/**
 * Barra empilhada com a proporção entre as situações.
 *
 * Fica logo acima das fichas de filtro, que funcionam como legenda: repetir
 * rótulo e contagem em um cartão separado duplicava a informação e empurrava a
 * tabela para fora da primeira tela. Cada segmento mantém o tooltip com nome,
 * quantidade e percentual.
 */
export function DistribuicaoSituacoes({ fatias }: Props) {
  const total = fatias.reduce((soma, fatia) => soma + fatia.quantidade, 0);
  if (total === 0) return null;

  return (
    <section className="distribuicao" aria-label="Distribuição por situação">
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
    </section>
  );
}
