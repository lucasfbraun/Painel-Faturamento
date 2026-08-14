import { useMemo, useState } from 'react';
import type { ContagemDiaria } from '../../tipos';
import { formatarData } from '../../utils/formatadores';
import { Dica, type PosicaoDica } from './Dica';

interface Props {
  serie: readonly ContagemDiaria[];
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

function ehFimDeSemana(iso: string): boolean {
  const [ano, mes, dia] = iso.split('-').map(Number) as [number, number, number];
  const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  return diaSemana === 0 || diaSemana === 6;
}

function nomeDoDia(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number) as [number, number, number];
  return DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()]!;
}

/**
 * Pedidos emitidos por dia, com linha de referência na média.
 *
 * Uma série só, então dispensa legenda — o título já a nomeia. Fins de semana
 * ficam com barra vazada: sem isso, a queda natural de sábado e domingo parece
 * um problema de operação.
 */
export function SerieDiaria({ serie }: Props) {
  const [dica, definirDica] = useState<{ posicao: PosicaoDica; ponto: ContagemDiaria } | null>(null);

  const { maior, media } = useMemo(() => {
    const valores = serie.map((d) => d.quantidade);
    const soma = valores.reduce((t, v) => t + v, 0);
    return { maior: Math.max(...valores, 1), media: valores.length ? soma / valores.length : 0 };
  }, [serie]);

  if (serie.length === 0) return null;

  const posicaoMedia = 100 - (media / maior) * 100;
  const intervaloRotulos = Math.ceil(serie.length / 8);

  return (
    <div className="grafico" onMouseLeave={() => definirDica(null)}>
      <div className="grafico__area" style={{ height: 116 }}>
        {/* Grade recessiva: dá escala sem competir com as barras. */}
        <div className="grafico__grade" aria-hidden="true">
          {[0, 1].map((fracao) => (
            <div key={fracao} className="grafico__grade-linha" style={{ top: `${fracao * 100}%` }}>
              <span>{Math.round(maior * (1 - fracao))}</span>
            </div>
          ))}
        </div>

        <div className="grafico__linha-media" style={{ top: `${posicaoMedia}%` }}>
          <span>média {media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/dia</span>
        </div>

        <div className="grafico__colunas grafico__colunas--densa">
          {serie.map((ponto) => (
            <div
              key={ponto.dia}
              className="grafico__coluna"
              onMouseMove={(evento) => {
                const caixa = evento.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                definirDica({
                  posicao: { x: evento.clientX - caixa.left, y: evento.clientY - caixa.top - 12 },
                  ponto,
                });
              }}
            >
              <div
                className={`grafico__barra${ehFimDeSemana(ponto.dia) ? ' grafico__barra--vazada' : ''}`}
                style={{ height: `${Math.max((ponto.quantidade / maior) * 100, ponto.quantidade > 0 ? 3 : 0)}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rótulos posicionados em percentual: com 30 barras, uma coluna por dia
          não teria largura para o texto e ele seria cortado. */}
      <div className="grafico__eixo grafico__eixo--posicionado">
        {serie.map((ponto, indice) =>
          indice % intervaloRotulos === 0 ? (
            <span key={ponto.dia} style={{ left: `${((indice + 0.5) / serie.length) * 100}%` }}>
              {`${ponto.dia.slice(8)}/${ponto.dia.slice(5, 7)}`}
            </span>
          ) : null,
        )}
      </div>

      <Dica posicao={dica?.posicao ?? null}>
        {dica && (
          <>
            <b>{formatarData(dica.ponto.dia)}</b> · {nomeDoDia(dica.ponto.dia)}
            <br />
            {dica.ponto.quantidade} {dica.ponto.quantidade === 1 ? 'pedido' : 'pedidos'}
          </>
        )}
      </Dica>
    </div>
  );
}
