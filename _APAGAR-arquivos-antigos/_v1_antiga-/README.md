# Painel de Faturamento — Pedidos de Venda (ERP on-premise)

Painel web que consulta a API de Pedidos de Venda do ERP a cada 5 minutos e mostra
KPIs de faturamento + a lista de pedidos, com **distinção por cor** do que está
disponível para faturar.

```
┌──────────────┐   GET a cada 5 min   ┌─────────────────────┐   HTTP    ┌─────────┐
│ ERP          │◀────────────────────▶│ container Docker    │◀─────────▶│ browser │
│ 10.1.1.220   │  (60 dias + ano)     │ node server.js:2000 │  /api/... │         │
└──────────────┘                      └─────────────────────┘           └─────────┘
```

O container é quem fala com o ERP — o navegador nunca chama `10.1.1.220` direto.
Isso resolve de uma vez **CORS**, **certificado autoassinado** e **exposição do token**
(o token fica no `.env` do servidor, não no HTML).

---

## 1. Subir

```bash
cd painelFaturamento
cp .env.example .env          # Windows: copy .env.example .env
# edite o .env com o seu token e a empresa
docker compose up -d --build
```

Acesse **http://localhost:2000**

```bash
docker compose logs -f        # acompanhar os ciclos de consulta
docker compose restart        # aplicar mudanças no .env
```

### Se o container não enxergar o ERP

O `10.1.1.220` precisa estar acessível a partir da rede do Docker. Se não estiver,
edite o `docker-compose.yml`: comente o bloco `ports` e descomente `network_mode: host`.

---

## 2. Como a consulta é montada

A cada ciclo o servidor calcula a data **no fuso America/Sao_Paulo** e monta:

| Parâmetro | Valor |
|---|---|
| `dataDigitacaoInicio` | hoje − 60 dias (`DIAS_RETROATIVOS`) |
| `dataDigitacaoFim` | hoje |
| `paginacao` | `ERP_PAGINACAO` (padrão 200) |
| `continuationToken` | seguido automaticamente até acabar a paginação |
| header `empresa` | `ERP_EMPRESA` |
| header `Authorization` | `ERP_TOKEN` |

**Consulta anual extra:** os KPIs de ano/mês/dia não cabem numa janela de 60 dias, então
o servidor faz um segundo GET com `dataDigitacaoInicio=<ano>-01-01` e guarda em cache
separado. O intervalo dessa consulta é o `ANO_INTERVALO_MIN` — está em 5 min (todo ciclo),
mas se o ERP sentir a carga, suba para `30` ou `60` sem afetar a tabela.

O front-end relê o cache do servidor a cada 30 s; quem bate no ERP é só o container.

---

## 3. KPIs

| KPI | Regra | Origem |
|---|---|---|
| Faturados no ano | `situacao = 6` e `dataEmissao` no ano corrente | consulta anual |
| Faturados no mês | `situacao = 6` e `dataEmissao` no mês corrente | consulta anual |
| Faturados no dia | `situacao = 6` e `dataEmissao = hoje` | consulta anual |
| Pedidos em aberto | `situacao ∈ {0,1,2,3,4,5,8}` | janela de 60 dias |
| Disponíveis p/ faturar | `situacao = 2` (Liberado) | janela de 60 dias |

Tudo isso é configurável no `.env` sem tocar no código:
`SIT_FATURADO`, `SIT_ABERTO`, `SIT_DISPONIVEL`.

> Ex.: para contar Faturado Parcial junto, `SIT_FATURADO=5,6`.
> Para tirar Bloqueado de "em aberto", `SIT_ABERTO=0,1,2,3,4,5`.

---

## 4. Tabela e cores

Colunas: **data de emissão · nº do pedido · código do cliente · situação · conferido**.

- Linha **verde com barra à esquerda** = situação 2 (Liberado) → disponível para faturar
- Linha **vermelha** = situação 8 (Bloqueado)
- Linha **cinza riscada** = situação 9 (Cancelado)
- Cada situação tem também um selo com cor + texto (a cor nunca é o único sinal),
  e a paleta foi validada para daltonismo em tema claro e escuro

O campo **conferido** vem de `dadosCustomizados → campo "conferido"` (Sim/Não), com
fallback para `pedidoConferido` (1/0).

Extras da tela: filtro por situação (chips), atalho "só disponíveis p/ faturar", busca por
pedido/cliente, ordenação por qualquer coluna, exportação CSV, tema claro/escuro e
botão "Atualizar agora" (força um ciclo fora do intervalo).

---

## 5. Endpoints

| Rota | O que faz |
|---|---|
| `GET /` | dashboard |
| `GET /api/dados` | snapshot completo (KPIs + pedidos normalizados) — útil para Power BI/Grafana |
| `GET /api/health` | 200 se o último ciclo deu certo, 503 se falhou (usado pelo HEALTHCHECK) |
| `POST /api/atualizar` | dispara um ciclo imediato |

---

## 6. Resiliência

- O último snapshot é gravado em `./data/snapshot.json` — após um restart a tela já abre preenchida.
- Se um ciclo falhar, a tela continua mostrando os dados anteriores com um aviso vermelho
  informando o erro e o horário do último dado bom.
- Ciclo que demora mais que o intervalo não empilha: o próximo é pulado.
- A resposta da API é lida de forma tolerante — array direto ou embrulhado em
  `pedidos` / `data` / `content` / `itens` / `result`, e o `continuationToken` é aceito
  no corpo ou no header.

---

## 7. Testar sem acesso ao ERP

```bash
node mock-erp.js &                                   # sobe uma API falsa em :8088
ERP_BASE_URL=http://localhost:8088 ERP_TOKEN=x node server.js
```

---

## 8. Pontos de atenção

- **Token:** o JWT do exemplo expira em 2028. Quando trocar, basta editar o `.env` e
  `docker compose restart` — não precisa rebuildar a imagem.
- **`ERP_TLS_INSECURE=true`** ignora a validação do certificado do ERP. É o esperado
  para um IP interno com certificado autoassinado; se um dia houver certificado válido
  (ou a CA interna), mude para `false`.
- **`dataEmissao` × data de faturamento:** os KPIs classificam o pedido em dia/mês/ano
  pela `dataEmissao`, porque o endpoint não devolve a data efetiva da nota. Se o ERP
  expuser esse campo em outro endpoint, dá para trocar em `calcularKpis()`.
- **Volume de dados:** a consulta anual carrega o ano inteiro em memória. Com dezenas de
  milhares de pedidos/ano, suba `ANO_INTERVALO_MIN` e considere guardar só a contagem.
