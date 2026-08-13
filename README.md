# Painel de Faturamento — Pedidos de Venda (ERP on-premise)

Painel web que consulta a API de Pedidos de Venda do ERP a cada 5 minutos e mostra
KPIs de faturamento + a lista de pedidos, com distinção por cor do que está
disponível para faturar.

```
┌──────────────┐  GET a cada 5 min  ┌────────────────────────┐   HTTP   ┌─────────┐
│ ERP          │◀──────────────────▶│ container Docker       │◀────────▶│ browser │
│ 10.1.1.220   │  (60 dias + ano)   │ Node 20 · porta 2000   │ /api/... │  React  │
└──────────────┘                    └────────────────────────┘          └─────────┘
```

O container é quem fala com o ERP — o navegador nunca chama `10.1.1.220` direto.
Isso resolve CORS, certificado autoassinado e exposição do token de uma vez só.

---

## 1. Subir

```bash
cp .env.example .env          # Windows: copy .env.example .env
# edite o .env: ERP_TOKEN, ERP_EMPRESA
docker compose up -d --build
```

Painel em **http://localhost:2000**

> A porta aparece em dois lugares: `PORT` no `.env` e `ports` no `docker-compose.yml`.
> Os dois números precisam ser iguais.

Sem Docker (precisa de Node 20+): **`iniciar-sem-docker.bat`**.

---

## 2. Estrutura

```
painelFaturamento/
├── src/                          BACK-END (TypeScript)
│   ├── main.ts                   composition root: cria e liga as dependências
│   ├── config/
│   │   ├── ambiente.ts           leitura e validação do .env
│   │   └── situacoes.ts          rótulos das situações (fonte única)
│   ├── dominio/                  regras de negócio puras, sem I/O
│   │   ├── tipos.ts              Pedido, Kpis, Snapshot, Situacao
│   │   └── kpis.ts               cálculo dos 5 indicadores
│   ├── erp/                      tudo que conhece a API do ERP
│   │   ├── clienteHttp.ts        HTTP + TLS autoassinado + timeout
│   │   ├── erroErp.ts            erros com dica de causa provável
│   │   ├── respostaErp.ts        leitura tolerante do formato de resposta
│   │   ├── normalizador.ts       pedido cru do ERP -> Pedido do domínio
│   │   └── repositorioPedidos.ts consulta por período + paginação
│   ├── aplicacao/                orquestração
│   │   ├── coletorDePedidos.ts   o ciclo: janela + ano + snapshot
│   │   ├── armazenamentoSnapshot.ts  cache em disco
│   │   └── agendador.ts          disparo a cada N minutos
│   ├── http/
│   │   ├── servidor.ts           servidor HTTP
│   │   ├── rotas.ts              tabela de rotas da API
│   │   └── arquivosEstaticos.ts  serve o bundle da tela
│   └── shared/                   datas (fuso) e logger
│
├── web/                          FRONT-END (Vite + React + TypeScript)
│   └── src/
│       ├── App.tsx               composição da tela e estado dos filtros
│       ├── tipos.ts              contrato de /api/dados
│       ├── api/painelApi.ts      único ponto de contato com o back-end
│       ├── hooks/                usePainel (dados), useTema
│       ├── dominio/              cores por situação, filtro e ordenação
│       ├── componentes/          Cabecalho, PainelKpis, TabelaPedidos, ...
│       ├── utils/                formatadores, exportação CSV
│       └── estilos/              tokens.css (design tokens) + global.css
│
├── tests/                        testes do domínio e da integração com o ERP
├── tools/erpFalso.ts             mock da API, para rodar sem a rede interna
├── Dockerfile                    multi-stage: build -> runtime sem dependências
└── docker-compose.yml
```

**Por que assim.** A dependência aponta sempre para dentro: `http` e `erp` dependem de
`dominio`, e `dominio` não depende de ninguém. Trocar o formato da resposta do ERP mexe
só em `erp/`; mudar uma regra de KPI mexe só em `dominio/kpis.ts`; mudar a tela não
toca no back-end. Nenhum módulo instancia suas próprias dependências — todas chegam
pelo construtor, o que permite testar cada peça com um dublê.

---

## 3. Desenvolvimento

```bash
npm install                  # dependências do back-end (só TypeScript)
npm run build                # compila back-end e front-end
npm start                    # sobe o servidor em http://localhost:2000
npm test                     # 58 testes (runner nativo do Node)

npm run dev                  # tsc em watch
npm run dev:web              # Vite com hot reload em :5173, /api vai para :2000
```

### Rodar sem acesso ao ERP

```bash
npm run build && npm run mock                                     # terminal 1
ERP_BASE_URL=http://localhost:8088 ERP_TOKEN=teste npm start      # terminal 2
```

---

## 4. Como a consulta é montada

| Parâmetro | Valor |
|---|---|
| `dataDigitacaoInicio` | hoje − 60 dias (`DIAS_RETROATIVOS`) |
| `dataDigitacaoFim` | hoje |
| `paginacao` | `ERP_PAGINACAO` (padrão 200) |
| `continuationToken` | seguido automaticamente até acabar |
| header `empresa` | `ERP_EMPRESA` |
| header `Authorization` | `ERP_TOKEN` |

A data de "hoje" é calculada em `America/Sao_Paulo`, não no UTC do container —
senão o dia viraria três horas antes.

**Consulta anual:** os KPIs de ano/mês/dia não cabem numa janela de 60 dias, então há
um segundo GET a partir de `<ano>-01-01`, com cache próprio (`ANO_INTERVALO_MIN`).

---

## 5. KPIs

| KPI | Regra | Origem |
|---|---|---|
| Faturados no ano | `situacao = 6`, `dataEmissao` no ano corrente | consulta anual |
| Faturados no mês | `situacao = 6`, `dataEmissao` no mês corrente | consulta anual |
| Faturados no dia | `situacao = 6`, `dataEmissao = hoje` | consulta anual |
| Pedidos em aberto | `situacao ∈ {0,1,2,3,4,5,8}` | janela de 60 dias |
| Disponíveis p/ faturar | `situacao = 2` (Liberado) | janela de 60 dias |

Configurável no `.env` sem tocar no código: `SIT_FATURADO`, `SIT_ABERTO`, `SIT_DISPONIVEL`.

### O que a tabela mostra

A grid é a visão operacional: só o que ainda exige ação. Por padrão ficam de fora
Faturado Parcial (5), Faturado Total (6) e Cancelado (9) — `SIT_OCULTAR_TABELA` no `.env`.

O corte vale **só para a tabela** (e para a barra e os filtros, que a acompanham).
Os KPIs continuam calculados sobre o conjunto completo, senão "faturados no mês"
ficaria sempre zerado. O cabeçalho mostra quantos pedidos foram escondidos.

> Para manter na grid os pedidos com faturamento parcial — que ainda têm saldo —
> use `SIT_OCULTAR_TABELA=6,9`.

---

## 6. Tabela e cores

Colunas: data de emissão · pedido · cliente · situação · conferência.

A linha carrega duas informações em **dois canais separados**, para não disputarem
a mesma pista visual:

| Canal | O que informa |
|---|---|
| **Fundo verde** | pedido **conferido** (`conferido = Sim`) |
| **Faixa lateral colorida** | **situação** do pedido |

Bloqueado tinge o fundo de vermelho só quando o pedido não está conferido — a
conferência é a informação procurada primeiro. Todo selo tem cor **e** rótulo, então
a cor nunca informa sozinha, e a paleta foi validada para daltonismo nos dois temas.

`conferido` vem de `dadosCustomizados → "conferido"`, com fallback para `pedidoConferido`.

---

## 6.1 Identidade visual

Aplica o `IDENTIDADE_VISUAL.md` do Grupo Flexível. O equivalente ao
`tailwind.config.ts` do projeto de origem é **`web/src/estilos/tokens.css`**: as cores
da marca aparecem uma vez só, e os componentes referenciam papéis
(`--acao`, `--superficie`, `--texto-1`), nunca hex.

| Marca | Onde aparece |
|---|---|
| Verde-petróleo `#0C3B38` | barra superior (gradiente com `#14534D`), situação Faturado Total |
| Teal `#0F7C70` | botões primários, chips ativos, situação Liberado |
| Verde-limão `#76C043` | pulso de status, hover do botão primário, selo Conferido, Transmitido |
| Âmbar `#FFAB40` | Faturado Parcial, status degradado |
| Vermelho `#E06C75` | Bloqueado, avisos de erro |
| Cinza `#F0F4F8` | fundo da página |

**Logo:** coloque o arquivo em **`web/public/logo.png`** e rode `npm run build:web`.
Ele aparece dentro do selo branco arredondado da barra (o texto do logo é escuro e
sumiria sobre o petróleo). Enquanto o arquivo não existir, a barra usa a assinatura
em texto — nada quebra.

**Fonte:** Roboto (300/400/500/700) empacotada via `@fontsource/roboto`, com fallback
para Segoe UI. Nada é buscado no Google Fonts em tempo de execução, o que mantém o
painel funcionando numa rede sem saída para a internet.

---

## 7. Endpoints

| Rota | O que faz |
|---|---|
| `GET /api/dados` | snapshot completo — serve também para Power BI/Grafana |
| `GET /api/health` | 200 se o último ciclo deu certo, 503 se falhou |
| `POST /api/atualizar` | dispara um ciclo imediato |
| qualquer outra | entrega a SPA |

---

## 8. Resiliência

- Snapshot salvo em `./data/snapshot.json`: após restart a tela abre preenchida.
- Ciclo que falha não apaga os dados anteriores — a tela mostra o aviso e o horário
  do último dado bom.
- Ciclo que demora mais que o intervalo é pulado, não empilhado.
- Resposta do ERP lida de forma tolerante (array solto ou dentro de `pedidos`/`data`/
  `content`/`itens`/`result`; `continuationToken` no corpo ou no header).
- Limite de páginas (`ERP_MAX_PAGINAS`) evita laço infinito se a API sempre devolver token.

---

## 9. Pontos de atenção

- **Build precisa de internet** para baixar React e Vite do npm. Em máquina sem acesso
  ao registry, use o `iniciar-sem-docker.bat` com o `dist/` que já vem pronto no pacote.
- **`ERP_TLS_INSECURE=true`** ignora a validação do certificado — esperado para um IP
  interno com certificado autoassinado. Havendo certificado válido, mude para `false`.
- **`dataEmissao` × data da nota:** os KPIs classificam por `dataEmissao` porque o
  endpoint não devolve a data efetiva de faturamento. Se o ERP expuser esse campo,
  a troca é em `src/dominio/kpis.ts`.
- **Volume:** a consulta anual carrega o ano em memória. Com dezenas de milhares de
  pedidos/ano, aumente `ANO_INTERVALO_MIN` e considere guardar só as contagens.
