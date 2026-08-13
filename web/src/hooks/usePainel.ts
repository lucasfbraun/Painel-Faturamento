import { useCallback, useEffect, useRef, useState } from 'react';
import { painelApi } from '../api/painelApi';
import type { Snapshot } from '../tipos';

/** De quanto em quanto tempo a tela relê o cache do servidor. */
const INTERVALO_LEITURA_MS = 30_000;
/** Espera antes de reler depois de pedir uma atualização manual. */
const ESPERA_POS_ATUALIZACAO_MS = 3_000;

export interface EstadoPainel {
  snapshot: Snapshot | null;
  carregando: boolean;
  atualizando: boolean;
  erroConexao: string | null;
  atualizarAgora: () => Promise<void>;
}

/**
 * Mantém o snapshot sincronizado com o servidor.
 *
 * Quem consulta o ERP é o back-end, a cada 5 minutos; aqui só relemos o cache,
 * o que mantém a tela barata mesmo com várias abas abertas.
 */
export function usePainel(): EstadoPainel {
  const [snapshot, definirSnapshot] = useState<Snapshot | null>(null);
  const [carregando, definirCarregando] = useState(true);
  const [atualizando, definirAtualizando] = useState(false);
  const [erroConexao, definirErroConexao] = useState<string | null>(null);
  const montado = useRef(true);

  const carregar = useCallback(async () => {
    try {
      const dados = await painelApi.obterSnapshot();
      if (!montado.current) return;
      definirSnapshot(dados);
      definirErroConexao(null);
    } catch (erro) {
      if (montado.current) definirErroConexao((erro as Error).message);
    } finally {
      if (montado.current) definirCarregando(false);
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    void carregar();
    const timer = setInterval(() => void carregar(), INTERVALO_LEITURA_MS);
    return () => {
      montado.current = false;
      clearInterval(timer);
    };
  }, [carregar]);

  const atualizarAgora = useCallback(async () => {
    definirAtualizando(true);
    try {
      await painelApi.solicitarAtualizacao();
      await new Promise((resolver) => setTimeout(resolver, ESPERA_POS_ATUALIZACAO_MS));
      await carregar();
    } catch (erro) {
      if (montado.current) definirErroConexao((erro as Error).message);
    } finally {
      if (montado.current) definirAtualizando(false);
    }
  }, [carregar]);

  return { snapshot, carregando, atualizando, erroConexao, atualizarAgora };
}
