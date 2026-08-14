import type { Analitico } from '../tipos';
import { emDias, formatarHoras } from '../utils/duracao';
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
  /** Explicação que aparece ao passar o mouse. */
  ajuda?: string;
  destaque?: boolean;
}

/** Acrescenta o equivalente em dias à explicação, quando ajuda a dimensionar. */
function comEquivalente(texto: string, horas: number | null): string {
  const dias = emDias(horas);
  return dias ? `${texto} Equivale a cerca de ${dias}.` : texto;
}

function metricasDePicking(picking: Analitico['picking']): Metrica[] {
  return [
    {
      rotulo: 'Tempo médio',
      valor: formatarHoras(picking.mediaHoras),
      ajuda: comEquivalente(
        'Tempo médio entre o aceite do pedido e o retorno da separação.',
        picking.mediaHoras,
      ),
      destaque: true,
    },
    {
      rotulo: 'Metade em até',
      valor: formatarHoras(picking.medianaHoras),
      ajuda: comEquivalente(
        'Metade dos pedidos foi separada nesse tempo ou menos — o caso típico. Quando é bem menor que o tempo médio, alguns pedidos muito lentos estão puxando a média para cima.',
        picking.medianaHoras,
      ),
    },
    {
      rotulo: '9 de 10 em até',
      valor: formatarHoras(picking.p90Horas),
      ajuda: comEquivalente(
        'Nove em cada dez pedidos foram separados nesse tempo ou menos. É o pior caso normal — o que sobra são as exceções.',
        picking.p90Horas,
      ),
    },
    {
      rotulo: 'Pedidos medidos',
      valor: String(picking.amostra),
      ajuda: 'Quantos pedidos entraram no cálculo. Só entram os que têm o aceite e o retorno do picking preenchidos no ERP.',
    },
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
          <span className="cartao__nota">separação · {diasDaJanela} dias</span>
        </header>

        {temAmostra ? (
          <>
            <div className="metricas">
              {metricasDePicking(picking).map((metrica) => (
                <div
                  key={metrica.rotulo}
                  className={`metrica${metrica.destaque ? ' metrica--destaque' : ''}`}
                  title={metrica.ajuda}
                >
                  <span className="metrica__rotulo">{metrica.rotulo}</span>
                  <span className="metrica__valor">{metrica.valor}</span>
                </div>
              ))}
            </div>
            <HistogramaPicking faixas={picking.distribuicao} total={picking.amostra} />
            {(picking.semMedicao > 0 || picking.inconsistentes > 0) && (
              <p className="cartao__rodape">
                {picking.semMedicao > 0 && `${picking.semMedicao} pedidos sem o aceite ou o retorno do picking preenchido`}
                {picking.semMedicao > 0 && picking.inconsistentes > 0 && ' · '}
                {picking.inconsistentes > 0 && `${picking.inconsistentes} com picking anterior ao aceite`}
                {' — fora do cálculo'}
              </p>
            )}
          </>
        ) : (
          <p className="estado-vazio">
            Nenhum pedido da janela tem o aceite e o retorno do picking preenchidos — sem
            esses dois campos não há como medir o tempo de separação.
          </p>
        )}
      </article>

      <article className="cartao">
        <header className="cartao__cabecalho">
          <h2>Ritmo de emissão</h2>
          <span className="cartao__nota">por dia · {porDia.length} dias</span>
        </header>
        <SerieDiaria serie={porDia} />
      </article>

      <article className="cartao">
        <header className="cartao__cabecalho">
          <h2>Curva de emissões</h2>
          <span className="cartao__nota">acumulado · {porDia.length} dias</span>
        </header>
        <CurvaDeEmissoes serie={porDia} />
      </article>
    </section>
  );
}
