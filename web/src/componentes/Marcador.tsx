interface Props {
  cor: string;
}

/** Bolinha colorida usada em KPIs, legendas e selos. Puramente decorativa. */
export function Marcador({ cor }: Props) {
  return <span className="marcador" style={{ background: cor }} aria-hidden="true" />;
}
