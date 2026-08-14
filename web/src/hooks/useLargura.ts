import { useEffect, useRef, useState } from 'react';

/**
 * Mede a largura de um elemento e reage a redimensionamentos.
 *
 * Gráficos em SVG precisam da largura real em pixels: esticar um viewBox
 * distorceria a espessura das linhas e achataria os marcadores.
 */
export function useLargura<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const referencia = useRef<T>(null);
  const [largura, definirLargura] = useState(0);

  useEffect(() => {
    const elemento = referencia.current;
    if (!elemento) return;

    const medir = () => definirLargura(elemento.getBoundingClientRect().width);
    medir();

    // ResizeObserver só existe a partir do Chrome 64; navegador de TV antigo não
    // tem. Sem alternativa, o gráfico ficaria com largura 0 e não desenharia —
    // então caímos no evento de redimensionamento da janela, que resolve o caso
    // real (a TV não muda de tamanho, mas a orientação e o zoom mudam).
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }

    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) definirLargura(entrada.contentRect.width);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return [referencia, largura];
}
