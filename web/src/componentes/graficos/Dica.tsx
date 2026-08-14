import type { ReactNode } from 'react';

export interface PosicaoDica {
  x: number;
  y: number;
}

interface Props {
  posicao: PosicaoDica | null;
  children: ReactNode;
}

/**
 * Tooltip dos gráficos. Posicionada em relação ao container (que precisa ter
 * `position: relative`) e sem captura de mouse, para não piscar ao passar por cima.
 */
export function Dica({ posicao, children }: Props) {
  if (!posicao) return null;
  return (
    <div className="dica" style={{ left: posicao.x, top: posicao.y }} role="tooltip">
      {children}
    </div>
  );
}
