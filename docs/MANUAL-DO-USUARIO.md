# Manual do Usuário — Painel de Faturamento

Guia de quem **usa** a tela. Para instalar, configurar ou mexer no código, veja o
[README](../README.md) e o [Guia de Operação](OPERACAO.md).

**Endereço:** http://localhost:2000 (ou o IP do servidor onde o painel roda, na
porta 2000). Funciona em qualquer navegador moderno, inclusive no celular.

---

## 1. Para que serve

Responder rápido a três perguntas do dia a dia do faturamento:

1. **O que já foi faturado?** — no ano, no mês e hoje.
2. **O que ainda está em aberto?** — quantos pedidos seguem em andamento.
3. **O que dá para faturar agora?** — os pedidos liberados, que é onde está a ação.

O painel **só lê** o ERP. Nada do que você faz aqui altera pedido, libera
faturamento ou grava qualquer coisa no sistema — é uma janela, não um formulário.

---

## 2. A tela, de cima para baixo

### 2.1 Barra superior

| Elemento | O que é |
|---|---|
| Título | identificação do painel |
| Linha cinza abaixo do título | empresa, período consultado e quantos pedidos estão na tabela |
| Pílula com bolinha verde | horário da última atualização e do próximo ciclo |
| **Atualizar agora** | força uma consulta ao ERP sem esperar os 5 minutos |
| **Exportar CSV** | baixa a tabela **como ela está filtrada** na tela, pronta para o Excel |
| Ícone de meia-lua | alterna entre tema claro e escuro |

A bolinha da pílula **pulsa em verde** quando o último ciclo deu certo e fica
**âmbar parada** quando falhou.

### 2.2 Os seis indicadores

| Indicador | O que conta |
|---|---|
| **Faturados no ano** | pedidos com situação *Faturado Total* emitidos no ano corrente |
| **Faturados no mês** | os mesmos, no mês corrente |
| **Faturados no dia** | os mesmos, com data de emissão de hoje |
| **Pedidos em aberto** | tudo que ainda não fechou o ciclo (digitado, listado, liberado, selecionado, faturado parcial e bloqueado) |
| **Aceite → Picking** | tempo médio entre o aceite do pedido e o retorno da separação |
| **Disponíveis p/ faturar** | pedidos **Liberados** — o cartão verde em destaque |

Os três primeiros olham o **ano inteiro**. Os três últimos olham a **janela de 60
dias**, que é o horizonte operacional. A letra miúda de cada cartão diz quais
situações entram na conta.

> **Por que os KPIs contam pedidos que não estão na tabela?** Porque são perguntas
> diferentes. Os indicadores medem o todo; a tabela mostra só o que ainda exige
> ação. Se a tabela mandasse nos KPIs, "faturados no mês" ficaria sempre zero.

### 2.3 Aceite → Picking

Quanto tempo o pedido passa na separação, medido entre o carimbo de **aceite** e o de
**retorno do picking**. Além da média, o cartão traz:

| Métrica | Para que serve |
|---|---|
| **Mediana** | o caso típico. Se estiver bem abaixo da média, alguns pedidos muito lentos estão puxando a média |
| **P90** | 9 em cada 10 pedidos ficam abaixo desse tempo — é o "pior caso normal" |
| **Mais rápido / mais lento** | os extremos do período |
| **Pedidos medidos** | quantos pedidos entraram na conta — só entram os que têm o aceite **e** o retorno do picking preenchidos no ERP |

O histograma abaixo mostra quantos pedidos caem em cada faixa de tempo. Passe o mouse
para ver a quantidade e o percentual.

> **Pedidos sem carimbo ficam fora da conta.** Se um pedido não tem o aceite ou o
> retorno do picking preenchido, ele não entra na média — contar como zero faria o
> indicador parecer melhor do que é. O rodapé do cartão informa quantos ficaram de fora.
>
> Exemplo: "Pedidos medidos 122" com "20 pedidos sem o aceite ou o retorno do picking
> preenchido" significa que a média descreve 122 dos 142 pedidos da janela.

Passar o mouse sobre qualquer um dos quatro quadros mostra a explicação dele.

### 2.4 Ritmo de emissão

Pedidos emitidos por dia nos últimos 30 dias. A linha tracejada laranja é a média do
período. **Barras vazadas são sábados e domingos** — sem essa marcação, a queda natural
do fim de semana pareceria um problema de operação.

### 2.5 Curva de emissões

A mesma informação do ritmo, vista como **acumulado**: quantos pedidos foram emitidos
desde o início do período até cada dia. Por acumular, a linha só sobe — o que informa é
a **inclinação**:

- trecho **íngreme** → muitos pedidos por dia
- trecho **plano** → poucos pedidos ou operação parada
- comparar a inclinação do começo com a do fim mostra se o ritmo acelerou ou caiu

O número na ponta é o total do período. Passe o mouse em qualquer ponto para ver a data,
o acumulado até ali e quantos pedidos entraram naquele dia.

### 2.6 Barra de proporção

A faixa fina acima dos filtros mostra a proporção entre as situações dos pedidos que
estão na tabela. Passe o mouse sobre um trecho para ver o nome, a quantidade e o
percentual — as fichas de filtro logo abaixo servem de legenda, com as mesmas cores.

### 2.7 Filtros

- **Só disponíveis p/ faturar** — atalho para os pedidos Liberados
- **Fichas de situação** — clique para incluir; clique de novo para tirar. Pode
  combinar várias. Nenhuma marcada = todas aparecem
- **Buscar pedido ou cliente** — aceita número do pedido, código ou nome do cliente

Os filtros valem também para o **Exportar CSV**: o arquivo sai com exatamente as
linhas que você está vendo.

### 2.8 A tabela

| Coluna | Conteúdo |
|---|---|
| Data emissão | data de emissão do pedido |
| Pedido | número do pedido no ERP |
| Cliente | código e nome |
| Situação | selo colorido com o nome da situação |
| Conferência | *Conferido* ✓ ou *Não conferido* ○ |

Clique em qualquer cabeçalho para ordenar; clique de novo para inverter. A tabela
já abre pela data de emissão, da mais recente para a mais antiga.

---

## 3. Como ler as cores

São **dois sinais independentes** em cada linha:

| Sinal | Significado |
|---|---|
| **Fundo verde** | pedido **conferido** |
| **Faixa colorida à esquerda** | **situação** do pedido (mesma cor do selo) |
| **Fundo avermelhado** | pedido **bloqueado** e ainda não conferido |

Assim dá para bater o olho e ver "conferido ou não" sem perder a situação. As cores
das situações:

| Situação | Cor |
|---|---|
| Digitado | cinza |
| Listado | azul |
| **Liberado** | **verde-teal da marca — é o que dá para faturar** |
| Selecionado Parcial | roxo |
| Selecionado Total | rosa |
| Transmitido | verde-limão |
| Bloqueado | vermelho |

Nenhuma informação depende só da cor: todo selo traz o nome escrito, e a paleta foi
verificada para daltonismo nos temas claro e escuro.

---

## 4. Quais pedidos aparecem

A tabela é a **lista de trabalho**, não o histórico. Ficam de fora:

- pedidos **já faturados** (parcial ou total)
- pedidos **cancelados**
- pedidos emitidos há **mais de 60 dias**

O cabeçalho avisa quantos foram escondidos: *"91 em acompanhamento · 51
faturados/cancelados ocultos"*. Quem quiser mudar esse corte, o administrador
ajusta uma linha do arquivo de configuração — está no [README](../README.md#5-kpis).

---

## 5. De quanto em quanto tempo atualiza

- O servidor consulta o ERP a cada **5 minutos**.
- A tela relê o resultado a cada **30 segundos** — por isso o número pode mudar
  sozinho enquanto você olha.
- **Atualizar agora** dispara uma consulta imediata; o resultado aparece em alguns
  segundos.
- Deixar o painel aberto em uma TV ou monitor extra não pesa no ERP: quem consulta
  é o servidor, uma vez só, independente de quantas telas estiverem abertas.

---

## 6. Quando aparece uma faixa vermelha de erro

Significa que a última consulta ao ERP falhou. **Os dados na tela continuam
válidos** — são os da última consulta bem-sucedida, e o aviso diz de que horas
são. O painel tenta de novo sozinho no ciclo seguinte.

Se o erro persistir por mais de 15 minutos, avise o TI com o texto da faixa: ele
diz a causa provável (token expirado, ERP fora do ar, rede). O
[Guia de Operação](OPERACAO.md) tem o que fazer em cada caso.

---

## 7. Perguntas frequentes

**A média de picking parece otimista demais.**
Confira "Pedidos medidos" e o rodapé do cartão: se muitos pedidos estão sem carimbo, a
média descreve só uma parte da operação. Compare também a média com a mediana — uma diferença grande
significa que poucos pedidos muito lentos estão distorcendo a média.

**O número do KPI não bate com o que vejo no ERP.**
Os KPIs classificam o pedido pela **data de emissão**, não pela data da nota fiscal
— o endpoint da API não devolve a data efetiva do faturamento. Um pedido emitido
em março e faturado em abril conta em **março**.

**Um pedido sumiu da tabela.**
Provavelmente foi faturado ou cancelado — é o comportamento esperado. Marque a
ficha da situação correspondente… se ela não estiver lá, confirme com o TI o
parâmetro `SIT_OCULTAR_TABELA`.

**A coluna Conferência mostra "Não conferido" para tudo.**
O painel lê o campo `conferido` do ERP. Se ele não vier preenchido, o padrão é
"Não conferido" — conservador de propósito, para não dar como conferido algo que
não foi.

**Posso usar esses dados no Power BI / Excel?**
Sim, de duas formas: **Exportar CSV** para uma foto pontual, ou apontar a
ferramenta direto para `http://<servidor>:2000/api/dados`, que devolve o mesmo
conteúdo em JSON e se atualiza sozinho.

**Preciso instalar alguma coisa?**
Não. É só abrir o endereço no navegador.
