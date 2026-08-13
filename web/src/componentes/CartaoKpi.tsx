import type { CSSProperties } from 'react';
import { formatarNumero } from '../utils/formatadores';
import { Marcador } from './Marcador';

export interface DadosKpi {
  rotulo: string;
  valor: number;
  dica: string;
  cor: string;
  /** Cartão-herói: o número que dispara a ação do dia. */
  destaque?: boolean;
}

export function CartaoKpi({ rotulo, valor, dica, cor, destaque = false }: DadosKpi) {
  const estilo = { '--kpi-cor': cor } as CSSProperties;

  return (
    <article className={`kpi${destaque ? ' kpi--destaque' : ''}`} style={estilo}>
      <h3 className="kpi__rotulo">
        <Marcador cor={destaque ? 'var(--marca-lima)' : cor} />
        {rotulo}
      </h3>
      <p className="kpi__valor">{formatarNumero(valor)}</p>
      <p className="kpi__dica">{dica}</p>
    </article>
  );
}
