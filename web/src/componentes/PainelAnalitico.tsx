import type { Analitico } from '../tipos';
import { formatarDuracao } from '../utils/duracao';
import { CurvaDeEmissoes } from './graficos/CurvaDeEmissoes';
import { HistogramaPicking } from './graficos/HistogramaPicking';
import { SerieDiaria } from './graficos/SerieDiaria';

interface Props {
  analitico: Analitico;
  diasDaJanela: number;
}

interface Metrica {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}

function metricasDePicking(picking: Analitico['picking']): Metrica[] {
  return [
    { rotulo: 'Média', valor: formatarDuracao(picking.mediaHoras), destaque: true },
    { rotulo: 'Mediana', valor: formatarDuracao(picking.medianaHoras) },
    { rotulo: 'P90', valor: formatarDuracao(picking.p90Horas) },
    { rotulo: 'Mais rápido', valor: formatarDuracao(picking.minimoHoras) },
    { rotulo: 'Mais lento', valor: formatarDuracao(picking.maximoHoras) },
    { rotulo: 'Amostra', valor: `${picking.amostra} pedidos` },
  ];
}

/**
 * Seção analítica: o tempo entre o aceite e o retorno do picking, e o ritmo de
 * emissão dos pedidos. Vive abaixo dos KPIs porque responde "como estamos indo",
 * não "o que fazer agora".
 */
export function PainelAnalitico({ analitico, diasDaJanela }: Props) {
  const { picking, porDia } = analitico;
  const temAmostra = picking.amostra > 0;

  return (
    <section className="analitico">
      <article className="cartao">
        <header className="cartao__cabecalho">
          <h2>Aceite → Picking</h2>
          <span className="cartao__nota">tempo de separação · janela de {diasDaJanela} dias</span>
        </header>

        {temAmostra ? (
          <>
            <div className="metricas">
              {metricasDePicking(picking).map((metrica) => (
                <div key={metrica.rotulo} className={`metrica${metrica.destaque ? ' metrica--destaque' : ''}`}>
                  <span className="metrica__rotulo">{metrica.rotulo}</span>
                  <span className="metrica__valor">{metrica.valor}</span>
                </div>
              ))}
            </div>
            <HistogramaPicking faixas={picking.distribuicao} total={picking.amostra} />
            {(picking.semMedicao > 0 || picking.inconsistentes > 0) && (
              <p className="cartao__rodape">
                {picking.semMedicao > 0 && `${picking.semMedicao} pedidos sem carimbo de aceite ou picking`}
                {picking.semMedicao > 0 && picking.inconsistentes > 0 && ' · '}
                {picking.inconsistentes > 0 && `${picking.inconsistentes} com picking anterior ao aceite`}
                {' — fora da amostra'}
              </p>
            )}
          </>
        ) : (
          <p className="estado-vazio">
            Nenhum pedido da janela tem os carimbos de aceite e retorno do picking preenchidos.
          </p>
        )}
      </article>

      <article className="cartao">
        <header className="cartao__cabecalho">
          <h2>Ritmo de emissão</h2>
          <span className="cartao__nota">pedidos por dia · últimos {porDia.length} dias</span>
        </header>
        <SerieDiaria serie={porDia} />
      </article>

      <article className="cartao analitico__largo">
        <header className="cartao__cabecalho">
          <h2>Curva de emissões</h2>
          <span className="cartao__nota">acumulado · últimos {porDia.length} dias</span>
        </header>
        <CurvaDeEmissoes serie={porDia} />
        <p className="cartao__rodape">
          A linha acumula os pedidos emitidos desde o início do período — a inclinação é
          que informa: trecho íngreme, mais pedidos por dia; trecho plano, operação parada.
        </p>
      </article>
    </section>
  );
}
