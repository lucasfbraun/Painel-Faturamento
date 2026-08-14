import { useCallback, useState } from 'react';

export type Tema = 'claro' | 'escuro';

const ATRIBUTO = 'data-theme';

function temaAtual(): Tema | null {
  const valor = document.documentElement.getAttribute(ATRIBUTO);
  return valor === 'dark' ? 'escuro' : valor === 'light' ? 'claro' : null;
}

function preferenciaDoSistema(): Tema {
  // matchMedia existe em qualquer navegador relevante, mas alguns aparelhos de TV
  // não implementam prefers-color-scheme e devolvem um objeto inútil. Na dúvida,
  // tema claro: é o que se lê melhor num televisor em sala iluminada.
  if (typeof window.matchMedia !== 'function') return 'claro';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  } catch {
    return 'claro';
  }
}

/**
 * Alterna entre claro e escuro. Sem preferência salva, o painel segue o sistema
 * operacional — o artifact não pode usar localStorage, então a escolha vale
 * enquanto a aba estiver aberta.
 */
export function useTema(): { tema: Tema; alternar: () => void } {
  const [tema, definirTema] = useState<Tema>(() => temaAtual() ?? preferenciaDoSistema());

  const alternar = useCallback(() => {
    definirTema((anterior) => {
      const proximo: Tema = anterior === 'escuro' ? 'claro' : 'escuro';
      document.documentElement.setAttribute(ATRIBUTO, proximo === 'escuro' ? 'dark' : 'light');
      return proximo;
    });
  }, []);

  return { tema, alternar };
}
