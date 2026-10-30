# ManyChat — resultado do quiz pelo WhatsApp

Na tela de resultado do quiz (quizinstagram.nubiajanuzzi.com) existe o botão
**"Receber meu resultado no WhatsApp"**. Ele abre o WhatsApp da Núbia
(+55 48 98865-2228) com uma mensagem pronta, por exemplo:

> RESULTADO DESACELERAR — quero receber meu retrato do quiz por aqui.

O ManyChat precisa reconhecer essa mensagem e responder com o parecer certo.

## Configuração (uma vez só)

Para cada um dos 4 resultados, no ManyChat:

1. **Automation → Keywords → New Keyword**, canal **WhatsApp**.
2. Regra: **Message contains** → a palavra-chave da tabela abaixo.
3. Em "Reply", crie um flow com a mensagem correspondente (texto pronto abaixo).
4. No fim da mensagem, adicione um botão **"Quero minha Sessão de Avaliação"**
   (ou deixe a pessoa responder na conversa — ela já está falando com você).
5. Opcional: ação **Add Tag** com `quiz_desacelerar` (etc.) para segmentar depois.
6. Salve e ative.

| Palavra-chave       | Tag sugerida       |
|---------------------|--------------------|
| RESULTADO DETECTAR    | quiz_detectar    |
| RESULTADO DESACELERAR | quiz_desacelerar |
| RESULTADO DECODIFICAR | quiz_decodificar |
| RESULTADO DIRECIONAR  | quiz_direcionar  |

Teste: faça o quiz no celular, toque no botão, envie a mensagem e confira se
a resposta chega.

## Textos prontos

Os textos são os mesmos da tela de resultado e do e-mail
(`src/lib/quizProtocolo4d.ts`). Se mudar lá, atualize aqui e no ManyChat.

### RESULTADO DETECTAR

Oi, {{first_name}}! Aqui está seu retrato do quiz do Protocolo 4D: *Detectar* 🌿

_Isso não é um diagnóstico — é um retrato simbólico e sensível de onde você está agora._

Seu padrão mostra que muita coisa acontece dentro de você antes de virar palavra. Isso não é falta de sensibilidade — é o oposto: você sente tanto que o corpo processa mais rápido do que a mente consegue nomear.

*Hipótese:* o primeiro movimento não é "controlar a emoção", é aprender a reconhecê-la enquanto ainda é pequena.

*Risco de seguir sem isso:* decisões e reações tomadas no automático, sem escolha real.

*Prática desta semana:* três vezes ao dia, nomear em uma palavra o que você sentiu, sem julgar.

Esse é exatamente o ponto em que a Sessão de Avaliação do Protocolo 4D entra — duas horas para transformar esse retrato em um plano concreto.

### RESULTADO DESACELERAR

Oi, {{first_name}}! Aqui está seu retrato do quiz do Protocolo 4D: *Desacelerar* 🌿

_Isso não é um diagnóstico — é um retrato simbólico e sensível de onde você está agora._

Você já percebe o que sente — o que falta não é consciência, é tempo. O corpo reage antes de a decisão consciente entrar em cena.

*Hipótese:* seu sistema aprendeu a reagir rápido como forma de proteção, e isso virou automático.

*Risco de seguir sem isso:* continuar respondendo no piloto automático justamente nas situações que pedem pausa.

*Prática desta semana:* antes de reagir, três respirações completas — não para controlar, só para abrir uma fresta de escolha.

Esse é exatamente o ponto em que a Sessão de Avaliação do Protocolo 4D entra — duas horas para transformar esse retrato em um plano concreto.

### RESULTADO DECODIFICAR

Oi, {{first_name}}! Aqui está seu retrato do quiz do Protocolo 4D: *Decodificar* 🌿

_Isso não é um diagnóstico — é um retrato simbólico e sensível de onde você está agora._

Você já sente e já percebe o padrão se repetindo — o que falta é entender a raiz. Daí a sensação de "eu sei que faço isso, mas não sei por quê".

*Hipótese:* o padrão tem uma função antiga que ainda não foi mapeada.

*Risco de seguir sem isso:* repetir o ciclo por anos por falta desse mapa.

*Prática desta semana:* quando o padrão aparecer, perguntar "a primeira vez que lembro de sentir isso foi quando?" — sem precisar responder agora, só observar.

Esse é exatamente o ponto em que a Sessão de Avaliação do Protocolo 4D entra — duas horas para transformar esse retrato em um plano concreto.

### RESULTADO DIRECIONAR

Oi, {{first_name}}! Aqui está seu retrato do quiz do Protocolo 4D: *Direcionar* 🌿

_Isso não é um diagnóstico — é um retrato simbólico e sensível de onde você está agora._

Você já entende a origem do padrão — o desafio agora é sustentar a mudança na prática, não só na cabeça.

*Hipótese:* entendimento sem estrutura de ação vira insight que não se sustenta na rotina.

*Risco de seguir sem isso:* ciclo de "eu sei o que preciso fazer" seguido de recaída, alimentando autocrítica.

*Prática desta semana:* escolher UMA situação específica para agir diferente — não a mudança inteira, só uma cena.

Esse é exatamente o ponto em que a Sessão de Avaliação do Protocolo 4D entra — duas horas para transformar esse retrato em um plano concreto.
