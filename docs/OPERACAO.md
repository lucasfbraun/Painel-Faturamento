# Guia de Operação — Painel de Faturamento

Runbook de quem mantém o painel no ar. Para uso da tela, veja o
[Manual do Usuário](MANUAL-DO-USUARIO.md).

---

## 1. Comandos do dia a dia

```powershell
cd C:\painelFaturamento

docker compose up -d --build     # subir (ou aplicar mudanças no código)
docker compose restart           # aplicar mudanças no .env
docker compose logs -f           # acompanhar os ciclos ao vivo
docker compose logs --tail=50    # últimas 50 linhas
docker compose ps                # estado do container
docker compose down              # parar e remover o container
```

Verificação rápida de saúde, sem abrir o navegador:

```powershell
curl http://localhost:2000/api/health
```

`{"ok":true,...}` = último ciclo bem-sucedido. HTTP 503 = falhou (o corpo traz o erro).

---

## 2. Como ler os logs

Um ciclo saudável:

```
INFO  painel disponível em http://localhost:2000
INFO  ERP https://10.1.1.220/api/comercial/v10/pedidoVenda | empresa 4 | janela 60 dias | ciclo 5 min
INFO  (coletor) consultando janela 2026-06-14 .. 2026-08-13 (empresa 4)
INFO  (coletor) consultando ano 2026-01-01 .. 2026-08-13
INFO  (coletor) ciclo concluído — 142 pedidos na janela (91 na tabela), 420 no ano (678ms)
```

| Linha | O que confirma |
|---|---|
| `painel disponível em ...` | a porta que o Node abriu — **tem que bater com o `ports` do compose** |
| `ERP ... \| empresa N` | que o `.env` foi lido (se mostrar valores que você não configurou, o `.env` não chegou) |
| `consultando janela` | as datas calculadas no fuso de São Paulo |
| `X na janela (Y na tabela)` | quantos foram escondidos por serem faturados/cancelados |
| `(678ms)` | tempo do ciclo. Se passar de 5 min, aumente `POLL_INTERVALO_MIN` |

---

## 3. Problemas conhecidos

### 3.1 `failed to connect to the docker API ... dockerDesktopLinuxEngine`

O Docker Desktop não está com o engine ligado.

1. Abra o Docker Desktop e espere a baleia ficar verde. Teste com `docker info`.
2. Travado em "starting": `wsl --shutdown` no PowerShell e reabra.
3. Confirme que está em *Linux containers* (botão direito no ícone da bandeja).

**Alternativa imediata:** `iniciar-sem-docker.bat` — roda o mesmo painel com o
Node direto, usando o `dist/` que já vem compilado.

### 3.2 A página não abre, mas o container está "Running"

Quase sempre é **porta cruzada**: o `PORT` do `.env` e o `ports` do
`docker-compose.yml` precisam ser o mesmo número.

```
docker compose logs | Select-String "painel disponível"
```

Se disser `:3000` e o compose publicar `2000:2000`, o Docker encaminha para uma
porta onde ninguém escuta. Acerte os dois e `docker compose up -d --force-recreate`.

> No Docker Desktop para Windows, `network_mode: host` **não** publica portas.
> Se estiver descomentado no compose, volte para `ports`.

### 3.3 `HTTP 401 do ERP`

A mensagem do log já distingue os dois casos:

- **"ERP_TOKEN está vazio no .env"** → o `.env` não foi lido ou a variável está em
  branco. Confira se o arquivo se chama `.env` mesmo (o Notepad salva `.env.txt`
  — veja com `dir /a`) e se foi salvo em **ANSI/UTF-8 sem BOM**; o BOM gruda na
  primeira variável e o Docker lê um nome diferente.
- **"token recusado pelo ERP"** → o JWT expirou ou não tem permissão nessa empresa.
  Gere um novo, cole em `ERP_TOKEN` e `docker compose restart`. O token vai **sem**
  o prefixo `Bearer`, exatamente como no `curl`.

### 3.4 `ETIMEDOUT` / `EHOSTUNREACH` / `ECONNREFUSED`

O container não alcança `10.1.1.220`. A tela abre normalmente, com a faixa vermelha
e os últimos dados bons. Verifique se o servidor do ERP está no ar e se a rede do
Docker enxerga aquela faixa de IP.

### 3.5 Erro de certificado (`self signed certificate`)

`ERP_TLS_INSECURE=true` no `.env` (é o padrão). Só mude para `false` quando o ERP
tiver certificado válido ou a CA interna estiver instalada.

### 3.6 O cartão "Aceite → Picking" aparece vazio

Nenhum pedido da janela tem `dataHoraAceite` e `retornoPicking` preenchidos. Confirme
com o time do ERP se esses campos customizados estão sendo gravados para a empresa
configurada — o painel apenas lê o que a API devolve.

### 3.7 O KPI do ano parece baixo demais

Compare `totalAno` no rodapé com o que o ERP mostra. Se estiver truncado, a API
pode estar limitando o retorno: aumente `ERP_PAGINACAO` e confira nos logs quantas
páginas foram percorridas.

### 3.8 A tela abre sem estilo ou com "Interface não encontrada"

O bundle do front-end não foi gerado. `docker compose up -d --build` refaz tudo;
fora do Docker, `npm run build:web`.

### 3.9 O build do Docker falha baixando pacotes

O estágio de build precisa alcançar o registry do npm (React, Vite). Em máquina com
saída bloqueada, use o `iniciar-sem-docker.bat`, que usa o `dist/` já compilado do
pacote e não instala nada.

---

## 4. Manutenção

### Trocar o token
Edite `ERP_TOKEN` no `.env` e `docker compose restart`. **Não precisa rebuildar** —
o `.env` é lido na subida do container, não na imagem.

### Mudar regra de negócio
Tudo no `.env`, sem tocar no código: `SIT_FATURADO`, `SIT_ABERTO`,
`SIT_DISPONIVEL`, `SIT_OCULTAR_TABELA`, `DIAS_RETROATIVOS`, `POLL_INTERVALO_MIN`,
`ANO_INTERVALO_MIN`, `DIAS_SERIE`. Depois, `docker compose restart`.

### Mudar o título ou a unidade exibida
`PAINEL_TITULO` e `PAINEL_SUBTITULO` no `.env`, depois `docker compose restart`. Útil
quando o mesmo container for replicado para outra filial — nada muda no código.

### Restringir o acesso à própria máquina
Troque `"2000:2000"` por `"127.0.0.1:2000:2000"` no `docker-compose.yml` (ou
`HOST=127.0.0.1` no `.env`, fora do Docker) e recrie o container.

### Reduzir a carga no ERP
`ANO_INTERVALO_MIN=30` ou `60` — a consulta anual passa a ser feita de hora em
hora, e a tabela continua atualizando a cada 5 minutos.

### Backup
Só o `.env` importa (tem o token e as regras). A pasta `data/` é cache descartável:
apagar só faz a tela abrir vazia até o primeiro ciclo terminar.

### Atualizar o painel
Substitua os arquivos de código e rode `docker compose up -d --build`. O `.env` e a
pasta `data/` não são tocados.

---

## 5. Checagem depois de qualquer mudança

```powershell
docker compose ps                   # deve estar "running (healthy)"
docker compose logs --tail=20       # deve terminar com "ciclo concluído"
curl http://localhost:2000/api/health
```

E, no código, antes de subir uma alteração:

```bash
npm test        # 91 testes; nenhum pode falhar
npm audit       # e, no front-end: npm --prefix web audit
```

---

## 6. Limites conhecidos

- A consulta anual carrega o ano inteiro em memória. Com dezenas de milhares de
  pedidos por ano, aumente `ANO_INTERVALO_MIN` e considere guardar só as contagens.
- Os KPIs usam `dataEmissao` porque o endpoint não devolve a data efetiva da nota.
- O painel é somente leitura — não há qualquer escrita no ERP.
- Não há autenticação na tela: quem alcança a porta 2000 vê o painel. Se precisar
  expor fora da rede interna, coloque um proxy reverso com autenticação na frente.
  Detalhes e alternativas em [SEGURANCA.md](SEGURANCA.md).
