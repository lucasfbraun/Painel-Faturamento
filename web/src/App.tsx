import { useCallback, useMemo, useState } from 'react';
import { AvisoErro } from './componentes/AvisoErro';
import { BarraFiltros } from './componentes/BarraFiltros';
import { Cabecalho } from './componentes/Cabecalho';
import { DistribuicaoSituacoes, type FatiaSituacao } from './componentes/DistribuicaoSituacoes';
import { PainelAnalitico } from './componentes/PainelAnalitico';
import { PainelKpis } from './componentes/PainelKpis';
import { TabelaPedidos } from './componentes/TabelaPedidos';
import { filtrarEOrdenar } from './dominio/filtrarPedidos';
import { usePainel } from './hooks/usePainel';
import { useTema } from './hooks/useTema';
import type { ColunaOrdenavel, Filtros, Ordenacao, Snapshot } from './tipos';
import { baixarCsv } from './utils/csv';
import { formatarHora } from './utils/formatadores';

const FILTROS_INICIAIS: Filtros = { situacoes: new Set<number>(), somenteDisponiveis: false, busca: '' };
const ORDENACAO_INICIAL: Ordenacao = { coluna: 'dataEmissao', direcao: -1 };

/** Converte a contagem por situação nas fatias usadas pela barra e pelos filtros. */
function montarFatias(snapshot: Snapshot | null): FatiaSituacao[] {
  if (!snapshot) return [];
  return Object.entries(snapshot.porSituacao)
    .filter(([codigo, quantidade]) => quantidade > 0 && codigo !== 'null')
    .map(([codigo, quantidade]) => ({
      codigo: Number(codigo),
      quantidade,
      rotulo: snapshot.meta.situacoes[Number(codigo)] ?? `Situação ${codigo}`,
    }))
    .sort((a, b) => a.codigo - b.codigo);
}

export function App() {
  const { snapshot, carregando, atualizando, erroConexao, atualizarAgora } = usePainel();
  const { alternar: alternarTema } = useTema();
  const [filtros, definirFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [ordenacao, definirOrdenacao] = useState<Ordenacao>(ORDENACAO_INICIAL);

  const fatias = useMemo(() => montarFatias(snapshot), [snapshot]);

  const pedidosVisiveis = useMemo(
    () => (snapshot ? filtrarEOrdenar(snapshot.pedidos, filtros, ordenacao, snapshot.meta.sitDisponivel) : []),
    [snapshot, filtros, ordenacao],
  );

  const alternarSituacao = useCallback((codigo: number) => {
    definirFiltros((anterior) => {
      const situacoes = new Set(anterior.situacoes);
      if (situacoes.has(codigo)) situacoes.delete(codigo);
      else situacoes.add(codigo);
      return { ...anterior, situacoes };
    });
  }, []);

  const alternarDisponiveis = useCallback(() => {
    definirFiltros((anterior) => ({ ...anterior, somenteDisponiveis: !anterior.somenteDisponiveis }));
  }, []);

  const buscar = useCallback((busca: string) => {
    definirFiltros((anterior) => ({ ...anterior, busca }));
  }, []);

  const ordenarPor = useCallback((coluna: ColunaOrdenavel) => {
    definirOrdenacao((anterior) =>
      anterior.coluna === coluna ? { coluna, direcao: anterior.direcao === 1 ? -1 : 1 } : { coluna, direcao: 1 },
    );
  }, []);

  const exportar = useCallback(() => {
    baixarCsv(pedidosVisiveis, `pedidos_${new Date().toISOString().slice(0, 10)}.csv`);
  }, [pedidosVisiveis]);

  return (
    <>
      <Cabecalho
        snapshot={snapshot}
        atualizando={atualizando}
        aoAtualizar={() => void atualizarAgora()}
        aoExportar={exportar}
        aoAlternarTema={alternarTema}
      />

      <main className="conteudo">
        {erroConexao && <AvisoErro titulo="Sem conexão com o servidor do painel:" mensagem={erroConexao} />}
        {snapshot?.erro && <AvisoErro mensagem={snapshot.erro} ultimaAtualizacao={snapshot.atualizadoEm} />}

        {carregando && !snapshot ? (
          <p className="estado-vazio">Carregando os dados do painel…</p>
        ) : snapshot ? (
          <>
            <PainelKpis kpis={snapshot.kpis} meta={snapshot.meta} />
            <DistribuicaoSituacoes fatias={fatias} />
            <BarraFiltros
              fatias={fatias}
              filtros={filtros}
              aoAlternarSituacao={alternarSituacao}
              aoAlternarDisponiveis={alternarDisponiveis}
              aoBuscar={buscar}
            />
            <TabelaPedidos pedidos={pedidosVisiveis} ordenacao={ordenacao} aoOrdenarPor={ordenarPor} />
            <PainelAnalitico analitico={snapshot.analitico} diasDaJanela={snapshot.janela.dias} />
          </>
        ) : null}
      </main>

      {snapshot && (
        <footer className="rodape">
          Consulta anual atualizada em {formatarHora(snapshot.meta.anoConsultadoEm)} · {snapshot.meta.totalAno} pedidos no
          ano · ciclo de {snapshot.meta.intervaloMin} min
        </footer>
      )}
    </>
  );
}
