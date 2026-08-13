import { useCallback, useState } from 'react';

export type Tema = 'claro' | 'escuro';

const ATRIBUTO = 'data-theme';

function temaAtual(): Tema | null {
  const valor = document.documentElement.getAttribute(ATRIBUTO);
  return valor === 'dark' ? 'escuro' : valor === 'light' ? 'claro' : null;
}

function preferenciaDoSistema(): Tema {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
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
