import { useEffect } from 'react';
import type { Snapshot } from '../tipos';
import { formatarData, formatarHora } from '../utils/formatadores';

interface Props {
  snapshot: Snapshot | null;
  atualizando: boolean;
  aoAtualizar: () => void;
  aoExportar: () => void;
  aoAlternarTema: () => void;
}

const TITULO_PADRAO = 'Painel de Faturamento';

/** Meia-lua: desenhada em SVG para não depender de glifo de fonte. */
function IconeTema() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
    </svg>
  );
}

/**
 * Contexto técnico da consulta — período, empresa e o que está na tabela.
 * Fica na terceira linha, em corpo menor: é referência, não identificação.
 */
function descreverConsulta(snapshot: Snapshot | null): string {
  if (!snapshot) return 'carregando…';
  const { janela, meta, pedidos } = snapshot;
  const ocultos = Math.max(0, meta.totalJanela - pedidos.length);
  const partes = [
    `Empresa ${meta.empresa}`,
    `${formatarData(janela.inicio)} a ${formatarData(janela.fim)} (${janela.dias} dias)`,
    `${pedidos.length} pedidos em acompanhamento`,
  ];
  if (ocultos > 0) partes.push(`${ocultos} faturados/cancelados ocultos`);
  return partes.join(' · ');
}

function descreverStatus(snapshot: Snapshot | null): string {
  if (!snapshot) return 'conectando…';
  if (!snapshot.ok) return 'falha na última consulta';
  return `${formatarHora(snapshot.atualizadoEm)} · próximo ${formatarHora(snapshot.proximaAtualizacao)}`;
}

export function Cabecalho({ snapshot, atualizando, aoAtualizar, aoExportar, aoAlternarTema }: Props) {
  const saudavel = snapshot?.ok ?? false;
  const titulo = snapshot?.meta.titulo || TITULO_PADRAO;
  const subtitulo = snapshot?.meta.subtitulo ?? '';

  // A aba do navegador também identifica a unidade — ajuda quando há vários
  // painéis abertos ou vários televisores em salas diferentes.
  useEffect(() => {
    document.title = subtitulo ? `${titulo} — ${subtitulo}` : titulo;
  }, [titulo, subtitulo]);

  return (
    <header className="barra-topo">
      <div className="barra-topo__identidade">
        <h1>{titulo}</h1>
        {subtitulo && <p className="barra-topo__unidade">{subtitulo}</p>}
        <p className="barra-topo__contexto">{descreverConsulta(snapshot)}</p>
      </div>

      <div className="barra-topo__acoes">
        <span className="pilula-status">
          <span
            className={`pulso${saudavel ? ' pulso--vivo' : ''}`}
            style={{ background: saudavel ? 'var(--marca-lima)' : 'var(--marca-ambar)' }}
            aria-hidden="true"
          />
          {descreverStatus(snapshot)}
        </span>

        <button type="button" className="botao botao--primario" onClick={aoAtualizar} disabled={atualizando}>
          {atualizando ? 'Atualizando…' : 'Atualizar agora'}
        </button>
        <button type="button" className="botao botao--fantasma" onClick={aoExportar}>
          Exportar CSV
        </button>
        <button
          type="button"
          className="botao botao--fantasma botao--icone"
          onClick={aoAlternarTema}
          title="Alternar tema claro/escuro"
          aria-label="Alternar tema claro/escuro"
        >
          <IconeTema />
        </button>
      </div>
    </header>
  );
}
