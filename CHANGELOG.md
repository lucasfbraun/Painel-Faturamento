# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [4.4.1] — 2026-08-14

### Corrigido
- **O aviso "Navegador não compatível" podia apagar um painel que estava
  funcionando.** Navegadores WebKit com o defeito conhecido do Safari 10.1 —
  vários televisores entre eles — executam o script `nomodule` mesmo suportando
  módulos. Como o script escrevia na tela às cegas no `DOMContentLoaded`, ele
  substituía a aplicação já montada. Agora só age se, passados 2,5 s, nada tiver
  sido montado.
- `matchMedia` protegido: aparelho que não implementa `prefers-color-scheme` não
  derruba mais a montagem da tela.

### Adicionado
- `diagnostico.js`: rede de segurança que, se a tela não montar em 8 s, escreve
  na própria página o erro capturado, o endereço e a identificação do navegador.
  Em televisor não há console — sem isso, uma falha vira tela preta muda.

## [4.4.0] — 2026-08-14

### Corrigido
- **O painel voltou a abrir em navegador de TV.** A atualização do Vite 5 → 7 na
  v4.0 trocou o alvo padrão do bundle para "baseline-widely-available"
  (Chrome 107+), deixando `?.` e `??` passarem crus para o JavaScript entregue —
  o que derruba qualquer televisor. O alvo agora é explícito:
  `es2017 / chrome61 / safari11 / firefox60 / edge18`.
- `ResizeObserver` (Chrome 64+) ganhou alternativa pelo evento de `resize`; sem
  ela, os gráficos ficavam com largura zero e não desenhavam.
- `AbortController` (Chrome 66+) virou opcional — sem ele, segue sem tempo limite
  em vez de a requisição inteira falhar.
- Tema escuro não depende mais de `:where()` (Chrome 88+), que fazia o bloco
  inteiro ser descartado em aparelhos antigos.
- `inset:` trocado por `top/right/bottom/left`, e `gap` de flexbox ganhou margens
  de reserva sob `@supports not (gap: 1px)`.

### Adicionado
- `/compat.html`: página de diagnóstico em JavaScript antigo, que roda em
  qualquer aparelho e mostra o navegador e quais recursos faltam.
- Aviso explicativo no lugar da tela preta quando o navegador não tem módulos ES.

## [4.3.0] — 2026-08-14

### Removido
- `ehDataIso()` em `shared/datas.ts` — validador que só existia para o próprio
  teste; nenhuma parte da aplicação o chamava. Removido junto com seus 3 testes.
- CSS órfão deixado por refatorações da tela: `.analitico__largo` (da época em
  que a curva ocupava a largura toda), `.distribuicao__legenda` e
  `.distribuicao__item` (a legenda virou as fichas de filtro) e
  `.grafico__eixo--datas` (substituído pelo eixo posicionado em percentual).
- Variáveis de cor declaradas e nunca referenciadas: `--acao-hover`,
  `--status-alerta` e `--status-bom`.
- `export` desnecessário em `NivelLog`, que só é usado dentro do próprio módulo.
- `COPY tests` e `COPY tools` do Dockerfile: nem os testes nem o mock rodam
  dentro da imagem, então só engordavam o contexto de build.
- Pasta `web/public`, que ficou vazia depois que o logo saiu da barra.

## [4.2.0] — 2026-08-14

### Adicionado
- Barra do topo agora identifica a finalidade do painel: título em destaque e a
  unidade logo abaixo, em verde-limão ("Filial Nordeste · Grupo Flexível").
- `PAINEL_TITULO` e `PAINEL_SUBTITULO` no `.env` — replicar o painel para outra
  filial não exige tocar no código.
- O título da aba do navegador passa a incluir a unidade, o que ajuda quando há
  vários painéis abertos ou televisores em salas diferentes.

### Alterado
- Contexto técnico (empresa, período, contagens) desceu para uma terceira linha,
  em corpo menor: é referência, não identificação.

## [4.1.0] — 2026-08-14

### Alterado
- **Uma unidade só para tempo em toda a tela: horas.** A formatação anterior
  trocava de notação conforme a grandeza ("45min", "1h30", "2d 17h"), o que
  obrigava a converter de cabeça para comparar dois números lado a lado.
- Termos estatísticos trocados por frases diretas no cartão de separação:
  "Média" → **Tempo médio**, "Mediana" → **Metade em até**, "P90" → **9 de 10 em
  até**. As explicações ao passar o mouse trazem o equivalente em dias.

## [4.0.0] — 2026-08-14

### Segurança
- Cabeçalhos em toda resposta: CSP restritiva, `nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy` e `Cross-Origin-Resource-Policy`.
- `POST /api/atualizar` passa a exigir mesma origem e a respeitar um limite de
  1 chamada a cada 10 segundos.
- Mensagens de erro do ERP deixaram de carregar o corpo da resposta para a tela —
  ele agora vai só para o log do servidor.
- Servidor de estáticos: comparação de caminho corrigida (prefixo com separador),
  rejeição de byte nulo e de codificação percentual inválida.
- Verbos fora de GET/HEAD/POST recebem 405; timeouts de cabeçalho, requisição e
  keep-alive definidos.
- Container endurecido: `read_only`, `cap_drop: ALL`, `no-new-privileges`, `/tmp` em
  memória e limite de 512 MB.
- `HOST` no `.env` para restringir a escuta a `127.0.0.1`.
- Vite atualizado para a linha 7 — `npm audit` limpo (a versão anterior arrastava
  uma vulnerabilidade do esbuild no servidor de desenvolvimento).
- Build deixou de embutir assets como `data:` URI, para a CSP poder manter
  `font-src 'self'` sem exceção.
- 17 testes novos cobrindo cada item acima.

### Adicionado
- `docs/SEGURANCA.md`: superfície de ataque, proteções, riscos aceitos e checklist.

### Corrigido
- `LimitadorDeChamadas` iniciava em 0 e barrava a primeira chamada sob relógio
  simulado (encontrado por teste).

## [3.4.0] — 2026-08-14

### Removido
- Logo da barra superior: o painel roda em TV corporativa que já exibe a marca na
  barra do sistema. A identidade visual segue nas cores e na tipografia.

## [3.3.1] — 2026-08-14

### Alterado
- "Amostra" virou **"Pedidos medidos"** no cartão Aceite → Picking, e as quatro
  métricas ganharam explicação ao passar o mouse. O termo estatístico não dizia
  nada para quem usa a tela.
- Rodapé do cartão reescrito em linguagem direta ("sem o aceite ou o retorno do
  picking preenchido — fora do cálculo").

## [3.3.0] — 2026-08-14

### Alterado
- Seção analítica compactada: os três gráficos passaram para uma única faixa de
  três colunas e a altura caiu de ~600 px para ~300 px, para a tabela voltar a
  aparecer na primeira tela.
- O cartão "Pedidos por situação" virou uma barra fina acima das fichas de
  filtro, que já funcionam como legenda — rótulo e contagem estavam duplicados.
- Campo de busca passou a ocupar o espaço restante da linha das fichas.

## [3.2.0] — 2026-08-14

### Adicionado
- **Curva de emissões**: gráfico de linha com o acumulado de pedidos emitidos no
  período, área em degradê, grade de referência, mira vertical com tooltip
  (dia, acumulado e emissões do dia) e o total rotulado na ponta da linha.
- `acumulado` em cada ponto da série diária, calculado e testado no domínio.

## [3.1.0] — 2026-08-14

### Adicionado
- **Indicador Aceite → Picking**: média do intervalo entre `dataHoraAceite` e
  `retornoPicking`, com mediana, P90, mínimo, máximo, tamanho da amostra e
  histograma por faixa de tempo.
- **Seção analítica** com dois gráficos interativos: distribuição do tempo de
  separação (rampa ordinal validada) e ritmo de emissão por dia, com linha de
  média, fins de semana vazados e tooltip por barra.
- `DIAS_SERIE` no `.env` para o tamanho da série diária (7 a 90 dias).
- Tipografia monoespaçada tabular nos números de dados.

## [3.0.0] — 2026-08-13

### Adicionado
- Identidade visual do Grupo Flexível: paleta da marca centralizada em
  `web/src/estilos/tokens.css`, barra superior em gradiente verde-petróleo,
  cartão-herói para "Disponíveis p/ faturar" e tema escuro reancorado no petróleo.
- Fonte Roboto empacotada via `@fontsource` (300/400/500/700) — sem depender do
  Google Fonts em tempo de execução.
- Suporte a logo em `web/public/logo.png`, exibido no selo branco da barra, com
  fallback para assinatura em texto quando o arquivo não existe.
- Manual do Usuário (`docs/MANUAL-DO-USUARIO.md`) e Guia de Operação
  (`docs/OPERACAO.md`).

### Alterado
- **Linha verde agora indica pedido conferido.** A situação passou para a faixa
  lateral colorida, separando os dois sinais em canais independentes.
- Coluna "Conferido" virou "Conferência", com selo ✓ Conferido / ○ Não conferido.

## [2.1.0] — 2026-08-13

### Alterado
- A tabela deixou de exibir pedidos faturados (5, 6) e cancelados (9);
  configurável por `SIT_OCULTAR_TABELA`. Os KPIs seguem contando o conjunto
  completo. O cabeçalho informa quantos pedidos foram ocultados.

### Corrigido
- A consulta anual era refeita a todo ciclo quando o ano voltava sem pedidos,
  ignorando `ANO_INTERVALO_MIN` (encontrado por teste automatizado).

## [2.0.0] — 2026-08-13

### Alterado
- Reestruturação completa. Back-end dividido em camadas (`dominio`, `erp`,
  `aplicacao`, `http`, `shared`) em TypeScript, com injeção de dependências pelo
  construtor e composition root em `src/main.ts`.
- Front-end migrado do HTML monolítico para Vite + React + TypeScript.
- Dockerfile multi-stage: build compila tudo, runtime roda sem dependências e
  como usuário não-root.

### Adicionado
- 58 testes no runner nativo do Node (`npm test`), cobrindo KPIs, datas,
  normalização, leitura da resposta do ERP, paginação e o ciclo de coleta.
- Endpoint `/api/health` com HEALTHCHECK no container.
- Mensagens de erro do ERP com dica de causa provável (401/403/404/5xx).

## [1.0.0] — 2026-08-13

### Adicionado
- Primeira versão: poller a cada 5 minutos com janela de 60 dias, consulta anual
  para os KPIs, paginação por `continuationToken`, TLS autoassinado, 5 KPIs,
  tabela com distinção por cor, filtros, exportação CSV e cache em disco.
