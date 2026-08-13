import type { Conferido } from '../tipos';

interface Props {
  valor: Conferido;
}

/** Conferido é um selo com ícone + palavra — a cor da linha é só reforço. */
export function IndicadorConferido({ valor }: Props) {
  const conferido = valor === 'Sim';

  return (
    <span className={`conferido ${conferido ? 'conferido--sim' : 'conferido--nao'}`}>
      {conferido ? (
        <span className="conferido__icone" aria-hidden="true">
          ✓
        </span>
      ) : (
        <span aria-hidden="true">○</span>
      )}
      {conferido ? 'Conferido' : 'Não conferido'}
    </span>
  );
}
