import { useState } from 'react';
import type { FaixaDeTempo } from '../../tipos';
import { Dica, type PosicaoDica } from './Dica';

interface Props {
  faixas: readonly FaixaDeTempo[];
  total: number;
}

/**
 * Distribuição do tempo de picking por faixa.
 *
 * Rampa ordinal de uma cor só (teal da marca), do claro ao escuro conforme a
 * faixa cresce — magnitude ordenada pede rampa, não cores categóricas. Os passos
 * foram validados: monotônicos em luminosidade e com o extremo claro acima de
 * 2:1 contra a superfície, nos dois temas.
 */
const PASSOS = 6;

export function HistogramaPicking({ faixas, total }: Props) {
  const [dica, definirDica] = useState<{ posicao: PosicaoDica; faixa: FaixaDeTempo } | null>(null);
  if (faixas.length === 0 || total === 0) return null;

  const maior = Math.max(...faixas.map((f) => f.quantidade), 1);

  return (
    <div className="grafico" onMouseLeave={() => definirDica(null)}>
      <div className="grafico__colunas" style={{ height: 104 }}>
        {faixas.map((faixa, indice) => {
          const altura = (faixa.quantidade / maior) * 100;
          const passo = Math.min(indice, PASSOS - 1) + 1;
          return (
            <div
              key={faixa.rotulo}
              className="grafico__coluna"
              onMouseMove={(evento) => {
                const caixa = evento.currentTarget.parentElement!.getBoundingClientRect();
                definirDica({
                  posicao: { x: evento.clientX - caixa.left, y: evento.clientY - caixa.top - 12 },
                  faixa,
                });
              }}
            >
              {faixa.quantidade > 0 && <span className="grafico__valor">{faixa.quantidade}</span>}
              <div
                className="grafico__barra"
                style={{
                  height: `${Math.max(altura, faixa.quantidade > 0 ? 3 : 0)}%`,
                  background: `var(--rampa-${passo})`,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="grafico__eixo">
        {faixas.map((faixa) => (
          <span key={faixa.rotulo}>{faixa.rotulo}</span>
        ))}
      </div>

      <Dica posicao={dica?.posicao ?? null}>
        {dica && (
          <>
            <b>{dica.faixa.rotulo}</b>
            <br />
            {dica.faixa.quantidade} pedidos · {Math.round((dica.faixa.quantidade / total) * 100)}%
          </>
        )}
      </Dica>
    </div>
  );
}
