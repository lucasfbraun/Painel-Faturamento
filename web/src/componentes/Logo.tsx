import { useState } from 'react';

/**
 * Logo da marca, sempre dentro do selo branco — o texto do logo é verde-escuro
 * e sumiria sobre o verde-petróleo da barra (regra da identidade visual).
 *
 * Basta colocar o arquivo em `web/public/logo.png`. Enquanto ele não existir,
 * cai para a assinatura em texto, sem quebrar o layout.
 */
export function Logo() {
  const [semArquivo, definirSemArquivo] = useState(false);

  return (
    <div className="selo-logo">
      {semArquivo ? (
        <span className="selo-logo__texto">
          grupo<span>flexível</span>
        </span>
      ) : (
        <img src="/logo.png" alt="Grupo Flexível" onError={() => definirSemArquivo(true)} />
      )}
    </div>
  );
}
