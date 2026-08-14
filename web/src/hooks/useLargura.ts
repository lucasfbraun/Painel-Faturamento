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

    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) definirLargura(entrada.contentRect.width);
    });
    observador.observe(elemento);
    definirLargura(elemento.getBoundingClientRect().width);

    return () => observador.disconnect();
  }, []);

  return [referencia, largura];
}
