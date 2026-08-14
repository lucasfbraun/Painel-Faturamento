# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
