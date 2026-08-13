import { corDaSituacao } from '../dominio/situacoes';
import type { Filtros } from '../tipos';
import type { FatiaSituacao } from './DistribuicaoSituacoes';
import { Marcador } from './Marcador';

interface Props {
  fatias: readonly FatiaSituacao[];
  filtros: Filtros;
  aoAlternarSituacao: (codigo: number) => void;
  aoAlternarDisponiveis: () => void;
  aoBuscar: (termo: string) => void;
}

export function BarraFiltros({ fatias, filtros, aoAlternarSituacao, aoAlternarDisponiveis, aoBuscar }: Props) {
  return (
    <div className="filtros">
      <button
        type="button"
        className={`ficha${filtros.somenteDisponiveis ? ' ficha--ativa' : ''}`}
        onClick={aoAlternarDisponiveis}
        aria-pressed={filtros.somenteDisponiveis}
      >
        <Marcador cor="var(--situacao-liberado)" />
        Só disponíveis p/ faturar
      </button>

      {fatias.map((fatia) => (
        <button
          key={fatia.codigo}
          type="button"
          className={`ficha${filtros.situacoes.has(fatia.codigo) ? ' ficha--ativa' : ''}`}
          onClick={() => aoAlternarSituacao(fatia.codigo)}
          aria-pressed={filtros.situacoes.has(fatia.codigo)}
        >
          <Marcador cor={corDaSituacao(fatia.codigo)} />
          {fatia.rotulo} <b>{fatia.quantidade}</b>
        </button>
      ))}

      <input
        className="filtros__busca"
        type="search"
        placeholder="Buscar pedido ou cliente"
        aria-label="Buscar pedido ou cliente"
        value={filtros.busca}
        onChange={(evento) => aoBuscar(evento.target.value)}
      />
    </div>
  );
}
