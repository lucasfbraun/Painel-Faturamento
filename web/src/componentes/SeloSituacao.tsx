import { corDaSituacao } from '../dominio/situacoes';
import { Marcador } from './Marcador';

interface Props {
  situacao: number | null;
  rotulo: string;
}

/** Selo de situação: cor + texto, nunca só cor. */
export function SeloSituacao({ situacao, rotulo }: Props) {
  return (
    <span className="selo">
      <Marcador cor={corDaSituacao(situacao)} />
      {rotulo}
    </span>
  );
}
