import { useMemo, useState } from 'react';
import { useLargura } from '../../hooks/useLargura';
import type { ContagemDiaria } from '../../tipos';
import { formatarData, formatarNumero } from '../../utils/formatadores';
import { Dica, type PosicaoDica } from './Dica';

interface Props {
  serie: readonly ContagemDiaria[];
}

const ALTURA = 150;
const MARGEM = { topo: 18, direita: 12, base: 20, esquerda: 34 } as const;
const LINHAS_DE_GRADE = 2;

interface Ponto {
  dia: string;
  diario: number;
  acumulado: number;
  x: number;
  y: number;
}

/** Escala "bonita" para o topo do eixo: 1, 2, 5 × 10^n. */
function tetoAgradavel(valor: number): number {
  if (valor <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(valor));
  const normalizado = valor / magnitude;
  const passo = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;
  return passo * magnitude;
}

/**
 * Curva acumulada de emissões: quantos pedidos foram emitidos desde o início da
 * série até cada dia. Por ser acumulada, a linha só cresce — a inclinação é que
 * informa: trecho mais íngreme, mais pedidos por dia; trecho plano, operação parada.
 *
 * Uma série só, então dispensa legenda: o título a nomeia. O total do período fica
 * rotulado direto na ponta da linha, em vez de espalhar números por todos os pontos.
 */
export function CurvaDeEmissoes({ serie }: Props) {
  const [container, largura] = useLargura<HTMLDivElement>();
  const [indiceAtivo, definirIndiceAtivo] = useState<number | null>(null);

  const { pontos, teto, totalPeriodo } = useMemo(() => {
    // O acumulado vem pronto do back-end, onde é calculado e testado.
    const acumulados = serie.map((ponto) => ({
      dia: ponto.dia,
      diario: ponto.quantidade,
      acumulado: ponto.acumulado,
    }));

    const total = acumulados[acumulados.length - 1]?.acumulado ?? 0;
    const limite = tetoAgradavel(total);
    const larguraUtil = Math.max(largura - MARGEM.esquerda - MARGEM.direita, 1);
    const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
    const ultimo = Math.max(acumulados.length - 1, 1);

    const calculados: Ponto[] = acumulados.map((item, indice) => ({
      ...item,
      x: MARGEM.esquerda + (indice / ultimo) * larguraUtil,
      y: MARGEM.topo + alturaUtil - (item.acumulado / limite) * alturaUtil,
    }));

    return { pontos: calculados, teto: limite, totalPeriodo: total };
  }, [serie, largura]);

  if (serie.length === 0) return null;

  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const base = ALTURA - MARGEM.base;
  const area = pontos.length
    ? `${linha} L${pontos[pontos.length - 1]!.x.toFixed(1)},${base} L${pontos[0]!.x.toFixed(1)},${base} Z`
    : '';

  const ativo = indiceAtivo !== null ? pontos[indiceAtivo] : undefined;
  const ultimoPonto = pontos[pontos.length - 1];
  const intervaloRotulos = Math.ceil(pontos.length / 5);

  function aoMover(evento: React.MouseEvent<HTMLDivElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect();
    const x = evento.clientX - caixa.left;
    const larguraUtil = Math.max(largura - MARGEM.esquerda - MARGEM.direita, 1);
    const fracao = (x - MARGEM.esquerda) / larguraUtil;
    const indice = Math.round(fracao * (pontos.length - 1));
    definirIndiceAtivo(Math.min(Math.max(indice, 0), pontos.length - 1));
  }

  return (
    <div className="grafico" ref={container} onMouseMove={aoMover} onMouseLeave={() => definirIndiceAtivo(null)}>
      {largura > 0 && (
        <svg width={largura} height={ALTURA} role="img" aria-label="Curva acumulada de emissões de pedidos">
          <defs>
            <linearGradient id="degrade-curva" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--acao)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--acao)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grade recessiva com os valores do eixo. */}
          {Array.from({ length: LINHAS_DE_GRADE + 1 }, (_, i) => {
            const fracao = i / LINHAS_DE_GRADE;
            const y = MARGEM.topo + (ALTURA - MARGEM.topo - MARGEM.base) * fracao;
            return (
              <g key={fracao}>
                <line x1={MARGEM.esquerda} y1={y} x2={largura - MARGEM.direita} y2={y} className="curva__grade" />
                <text x={MARGEM.esquerda - 8} y={y + 3.5} textAnchor="end" className="curva__rotulo">
                  {formatarNumero(Math.round(teto * (1 - fracao)))}
                </text>
              </g>
            );
          })}

          <path d={area} fill="url(#degrade-curva)" />
          <path d={linha} className="curva__linha" />

          {/* Ponta da linha com o total do período — rótulo direto, sem legenda. */}
          {ultimoPonto && (
            <>
              <circle cx={ultimoPonto.x} cy={ultimoPonto.y} r="4.5" className="curva__ponta" />
              <text x={ultimoPonto.x - 8} y={ultimoPonto.y - 12} textAnchor="end" className="curva__total">
                {formatarNumero(totalPeriodo)} pedidos
              </text>
            </>
          )}

          {/* Mira do ponto sob o cursor. */}
          {ativo && (
            <>
              <line x1={ativo.x} y1={MARGEM.topo} x2={ativo.x} y2={base} className="curva__mira" />
              <circle cx={ativo.x} cy={ativo.y} r="5" className="curva__marcador" />
            </>
          )}

          {/* Eixo de datas. */}
          {pontos.map((ponto, indice) =>
            indice % intervaloRotulos === 0 ? (
              <text key={ponto.dia} x={ponto.x} y={ALTURA - 8} textAnchor="middle" className="curva__rotulo">
                {`${ponto.dia.slice(8)}/${ponto.dia.slice(5, 7)}`}
              </text>
            ) : null,
          )}
        </svg>
      )}

      <Dica posicao={ativo ? ({ x: ativo.x, y: ativo.y - 10 } as PosicaoDica) : null}>
        {ativo && (
          <>
            <b>{formatarData(ativo.dia)}</b>
            <br />
            {formatarNumero(ativo.acumulado)} acumulados
            <br />
            {ativo.diario} no dia
          </>
        )}
      </Dica>
    </div>
  );
}
