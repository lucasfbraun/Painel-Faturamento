import { formatarHora } from '../utils/formatadores';

interface Props {
  mensagem: string;
  ultimaAtualizacao?: string | null;
  titulo?: string;
}

export function AvisoErro({ mensagem, ultimaAtualizacao, titulo = 'Erro ao consultar o ERP:' }: Props) {
  return (
    <div className="aviso-erro" role="alert">
      <b>{titulo}</b> {mensagem}
      {ultimaAtualizacao && ` — exibindo os dados de ${formatarHora(ultimaAtualizacao)}.`}
    </div>
  );
}
