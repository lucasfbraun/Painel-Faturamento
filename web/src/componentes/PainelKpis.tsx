import { corDaSituacao } from '../dominio/situacoes';
import { Situacao, type Kpis, type MetaSnapshot } from '../tipos';
import { listarCodigos } from '../utils/formatadores';
import { CartaoKpi, type DadosKpi } from './CartaoKpi';

interface Props {
  kpis: Kpis;
  meta: MetaSnapshot;
}

function montarCartoes(kpis: Kpis, meta: MetaSnapshot): DadosKpi[] {
  const corFaturado = corDaSituacao(Situacao.FaturadoTotal);
  return [
    {
      rotulo: 'Faturados no ano',
      valor: kpis.faturadosAno,
      dica: `situação ${listarCodigos(meta.sitFaturado)} · por data de emissão`,
      cor: corFaturado,
    },
    { rotulo: 'Faturados no mês', valor: kpis.faturadosMes, dica: 'mês corrente', cor: corFaturado },
    { rotulo: 'Faturados no dia', valor: kpis.faturadosDia, dica: 'hoje', cor: corFaturado },
    {
      rotulo: 'Pedidos em aberto',
      valor: kpis.emAberto,
      dica: `situação ${listarCodigos(meta.sitAberto)}`,
      cor: corDaSituacao(Situacao.Listado),
    },
    {
      rotulo: 'Disponíveis p/ faturar',
      valor: kpis.disponiveisFaturar,
      dica: 'situação 2 — Liberado',
      cor: corDaSituacao(Situacao.Liberado),
      destaque: true,
    },
  ];
}

export function PainelKpis({ kpis, meta }: Props) {
  return (
    <section className="kpis" aria-label="Indicadores">
      {montarCartoes(kpis, meta).map((cartao) => (
        <CartaoKpi key={cartao.rotulo} {...cartao} />
      ))}
    </section>
  );
}
