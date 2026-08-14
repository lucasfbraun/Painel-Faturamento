# Segurança — Painel de Faturamento

Revisão do que a aplicação expõe, o que já está protegido e o que continua sendo
risco aceito. Contexto: o painel roda na rede interna, é **somente leitura** e nunca
escreve no ERP.

---

## 1. Superfície de ataque

| Porta / rota | Quem alcança | O que entrega |
|---|---|---|
| `GET /` e estáticos | rede interna | a tela (HTML, JS, CSS) |
| `GET /api/dados` | rede interna | pedidos da janela, KPIs e séries |
| `GET /api/health` | rede interna | se o último ciclo deu certo |
| `POST /api/atualizar` | rede interna | antecipa um ciclo de coleta |

Não existe rota de escrita, upload, execução de comando ou consulta parametrizada
pelo cliente: **a URL que vai ao ERP é montada inteiramente pelo servidor**, a partir
do `.env` e da data de hoje. Nada do que o navegador manda influencia essa consulta.

---

## 2. O que está protegido

### Token do ERP
Fica só no processo do servidor (`ERP_TOKEN`, lido do `.env`). Não aparece no HTML,
no JavaScript, no `/api/dados` nem em log. O navegador nunca fala com `10.1.1.220`.

### Cabeçalhos de segurança
Toda resposta leva:

| Cabeçalho | Efeito |
|---|---|
| `Content-Security-Policy` | scripts, estilos e fontes só do próprio servidor; `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'none'`, `base-uri 'none'` |
| `X-Content-Type-Options: nosniff` | impede o navegador de "adivinhar" tipo de conteúdo |
| `Referrer-Policy: no-referrer` | a URL interna não vaza em navegação externa |
| `Permissions-Policy` | desliga câmera, microfone e geolocalização |
| `Cross-Origin-Resource-Policy: same-origin` | outro site não consegue carregar os recursos |

**Não há `Access-Control-Allow-Origin`.** Sem esse cabeçalho, um site externo até
consegue disparar a requisição, mas o navegador impede que ele **leia** a resposta.

### Exibição em iframe — decisão consciente
`frame-ancestors` é **liberado por padrão** (`PERMITIR_EMBUTIR=*`), porque software de
TV corporativa carrega o painel dentro de um iframe. Bloquear por padrão deixaria o
caso de uso principal quebrado — foi o que aconteceu entre a v4.0 e a v4.5.

O risco associado é clickjacking: alguém sobrepor a tela e induzir um clique. Aqui ele
é irrelevante — o painel não tem ação destrutiva, e a única rota `POST` só antecipa uma
leitura e ainda exige mesma origem. Quem não usa TV pode fechar com
`PERMITIR_EMBUTIR=nao`, ou listar as origens permitidas:
`PERMITIR_EMBUTIR=http://tv.empresa:8080`. Com qualquer permissão, `X-Frame-Options`
é omitido de propósito: ele não sabe listar origens (o `ALLOW-FROM` foi abandonado) e,
se enviado, venceria a política mais específica do `frame-ancestors`.

### Travessia de diretório
O servidor de estáticos resolve o caminho absoluto e recusa qualquer coisa fora da
raiz, incluindo `../`, `..%2f`, `%2e%2e/` e byte nulo. Codificação percentual inválida
devolve 400 em vez de derrubar a requisição. Há teste automatizado para cada um
desses casos.

### `POST /api/atualizar`
- só aceita requisição da própria página (`Sec-Fetch-Site`, com `Origin` × `Host`
  como reserva) — assim um site aberto em outra aba não usa o navegador de quem tem
  acesso para disparar carga no ERP;
- limitado a **1 chamada a cada 10 segundos** — um botão preso ou um script em laço
  não transformam o painel em gerador de carga contra o ERP;
- clientes sem navegador (curl, Power BI) continuam aceitos: não carregam credencial
  de ambiente, então não há risco de confused deputy.

### Mensagens de erro
A tela recebe `"O ERP respondeu HTTP 500 — falha no lado do ERP"`. O **corpo** da
resposta do ERP — que pode trazer caminho de arquivo, nome de tabela ou stack trace —
vai só para o log do servidor.

### XSS
A tela é React, que escapa todo texto interpolado por padrão. Não há
`dangerouslySetInnerHTML` nem `eval` em lugar nenhum. Mesmo que o ERP devolvesse um
nome de cliente com `<script>`, ele apareceria como texto.

### Verbos e conexões
Só `GET`, `HEAD` e `POST` são aceitos; o resto recebe 405. Timeouts de cabeçalho,
requisição e keep-alive impedem que conexões lentas fiquem segurando recursos.

### Container
Roda como usuário `node` (não-root), com sistema de arquivos **somente leitura**
(exceto `/app/data` e um `/tmp` em memória), **todas** as capacidades de kernel
removidas, `no-new-privileges` e teto de 512 MB. A imagem final não tem dependências
de execução — só o Node e os artefatos compilados.

### Fontes e assets
O build não embute arquivos como `data:` URI (`assetsInlineLimit: 0`). Sem isso, a
Roboto viraria `url(data:font/woff2;…)` e exigiria afrouxar a CSP com `font-src data:`
— resolver no build custa menos que pagar em política.

### Dependências
`npm audit` limpo nos dois projetos. Em produção o back-end **não tem dependências**;
React e Vite só existem no estágio de build.

---

## 3. Riscos aceitos (decisão consciente)

### 3.1 Não há autenticação na tela
**Quem alcança a porta 2000 na rede interna vê o painel** — e, por consequência,
`/api/dados`, que lista número de pedido, código e nome de cliente e situação.

Aceitável enquanto o painel vive em rede interna confiável e numa TV corporativa.
**Não exponha essa porta na internet nem em VPN de terceiros** sem colocar um proxy
reverso com autenticação na frente (nginx, Caddy, Traefik). Se precisar disso, avise
que eu preparo a configuração.

Para restringir o painel à própria máquina, sem alcance de rede:

```yaml
ports:
  - "127.0.0.1:2000:2000"     # em vez de "2000:2000"
```

Ou, rodando sem Docker, `HOST=127.0.0.1` no `.env`.

### 3.2 `ERP_TLS_INSECURE=true`
A validação do certificado do ERP está desligada, porque `10.1.1.220` usa certificado
autoassinado. O tráfego continua **criptografado**, mas um atacante já posicionado
dentro da rede poderia se passar pelo ERP (man-in-the-middle) e o painel aceitaria.

Como fechar, em ordem de preferência: instalar a CA interna no container e mudar para
`ERP_TLS_INSECURE=false`; ou emitir certificado válido para o host do ERP.

### 3.3 HTTP sem TLS entre o navegador e o painel
O painel serve HTTP puro. Numa LAN confiável é o padrão para esse tipo de ferramenta;
se um dia trafegar por rede menos controlada, o caminho é o mesmo proxy reverso do
item 3.1, com certificado.

### 3.4 Token de longa validade
O JWT em uso expira em 2028. Se vazar, vale até lá. Reduzir a validade e trocar
periodicamente é assunto do lado do ERP, mas vale saber que o arquivo `.env` é o
ativo mais sensível do projeto: **não versione, não copie para pasta compartilhada**.

---

## 4. Checklist antes de expor para mais gente

- [ ] `.env` fora de qualquer repositório ou pasta compartilhada
- [ ] Porta 2000 alcançável apenas de dentro da rede que precisa dela
- [ ] Proxy reverso com autenticação, se o acesso passar de "rede interna"
- [ ] CA interna instalada e `ERP_TLS_INSECURE=false`, quando possível
- [ ] `npm audit` limpo depois de cada atualização de dependência
- [ ] `npm test` passando (há testes específicos para cada item da seção 2)

---

## 5. O que foi verificado e não é problema

- **Injeção na consulta ao ERP** — a URL é montada com `URLSearchParams` a partir de
  configuração e data; nenhum parâmetro vem do cliente.
- **Prototype pollution** — a resposta do ERP é lida campo a campo para objetos novos;
  nada é mesclado com `Object.assign` ou spread sobre `{}` herdado.
- **Path traversal no snapshot** — o caminho vem da configuração, não de requisição.
- **Vazamento do token em erro** — a mensagem de 401 diz *que* o token foi recusado,
  nunca o valor dele.
- **CSRF em rota de escrita** — não existe rota de escrita; a única rota `POST` só
  antecipa uma leitura, e mesmo assim exige mesma origem.
