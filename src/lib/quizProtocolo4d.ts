// Estágios na ordem de prioridade do Protocolo 4D — usada também como
// critério de desempate: em caso de empate, prevalece o estágio mais inicial.
export const STAGES = ['detectar', 'desacelerar', 'decodificar', 'direcionar'] as const;

export type Stage4D = (typeof STAGES)[number];

export const STAGE_TITLES: Record<Stage4D, string> = {
  detectar: 'Detectar',
  desacelerar: 'Desacelerar',
  decodificar: 'Decodificar',
  direcionar: 'Direcionar',
};

export const CONSENT_TEXT =
  'Suas respostas são usadas só para gerar seu parecer simbólico e não substituem avaliação profissional. Ao continuar, você concorda em receber esse resultado por e-mail/WhatsApp.';

export const DISCLAIMER_TEXT =
  'Isso não é um diagnóstico — é um retrato simbólico e sensível de onde você está agora.';

export const FECHAMENTO_TEXT =
  'Esse é exatamente o ponto em que a Sessão de Avaliação do Protocolo 4D entra — duas horas para transformar esse retrato em um plano concreto.';

interface QuizOption {
  stage: Stage4D;
  label: string;
}

interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'Quando algo te incomoda, o que geralmente acontece primeiro?',
    options: [
      { stage: 'detectar', label: 'Eu nem sempre sei nomear o que senti, só sei que algo ficou errado' },
      { stage: 'desacelerar', label: 'Eu sinto e já reajo (grito, choro, saio, como, evito) antes de perceber' },
      { stage: 'decodificar', label: 'Eu entendo o que senti, mas não sei de onde isso vem' },
      { stage: 'direcionar', label: 'Eu sei exatamente o que é e de onde vem, mas repito o mesmo padrão mesmo assim' },
    ],
  },
  {
    question: 'Como você reage a um "não" ou uma frustração do dia a dia?',
    options: [
      { stage: 'detectar', label: 'Demoro a perceber que aquilo me incomodou' },
      { stage: 'desacelerar', label: 'O corpo já fica tenso e eu reajo rápido demais' },
      { stage: 'decodificar', label: 'Vejo o padrão se repetindo, mas não entendo o porquê' },
      { stage: 'direcionar', label: 'Sei o porquê, mas não consigo agir diferente na próxima vez' },
    ],
  },
  {
    question: 'Nos seus relacionamentos, o que mais se repete?',
    options: [
      { stage: 'detectar', label: 'Só percebo que me machuquei bem depois que a situação já passou' },
      { stage: 'desacelerar', label: 'Exploto ou me fecho no automático, antes de conseguir pensar' },
      { stage: 'decodificar', label: 'Vejo que sempre me envolvo com o mesmo tipo de situação, mas não sei por quê' },
      { stage: 'direcionar', label: 'Sei exatamente qual é o meu padrão nos relacionamentos, mas ele continua acontecendo' },
    ],
  },
  {
    question: 'E com seu corpo e autocuidado?',
    options: [
      { stage: 'detectar', label: 'Só noto que estou esgotada quando o corpo já deu um sinal forte (dor, doença, crise)' },
      { stage: 'desacelerar', label: 'Sei que preciso parar, mas sigo no automático até não aguentar mais' },
      { stage: 'decodificar', label: 'Entendo que meu corpo reage ao estresse de um jeito específico, mas não sei a raiz' },
      { stage: 'direcionar', label: 'Sei o que meu corpo precisa, mas não consigo sustentar a mudança na rotina' },
    ],
  },
  {
    question: 'No trabalho ou nos seus projetos, o que mais trava?',
    options: [
      { stage: 'detectar', label: 'Não sei dizer se estou insatisfeita ou só cansada — as sensações se misturam' },
      { stage: 'desacelerar', label: 'Aceito demanda demais antes de perceber que já passei do limite' },
      { stage: 'decodificar', label: 'Sei que travo sempre no mesmo tipo de situação, mas não entendo a causa' },
      { stage: 'direcionar', label: 'Sei exatamente o que me trava, mas não consigo agir diferente na prática' },
    ],
  },
  {
    question: 'Quando você tenta mudar algo em si mesma, o que costuma acontecer?',
    options: [
      { stage: 'detectar', label: 'Nem sempre sei nomear o que quero mudar de verdade' },
      { stage: 'desacelerar', label: 'Tomo a decisão, mas na hora H reajo do jeito antigo' },
      { stage: 'decodificar', label: 'Entendo o padrão intelectualmente, mas ele continua se repetindo' },
      { stage: 'direcionar', label: 'Já mudei o entendimento, falta sustentar a mudança na rotina' },
    ],
  },
];

export interface Parecer {
  intro: string;
  hipotese: string;
  risco: string;
  pratica: string;
}

export const PARECERES: Record<Stage4D, Parecer> = {
  detectar: {
    intro:
      'Seu padrão mostra que muita coisa acontece dentro de você antes de virar palavra. Isso não é falta de sensibilidade — é o oposto: você sente tanto que o corpo processa mais rápido do que a mente consegue nomear.',
    hipotese: 'o primeiro movimento não é "controlar a emoção", é aprender a reconhecê-la enquanto ainda é pequena.',
    risco: 'decisões e reações tomadas no automático, sem escolha real.',
    pratica: 'três vezes ao dia, nomear em uma palavra o que você sentiu, sem julgar.',
  },
  desacelerar: {
    intro:
      'Você já percebe o que sente — o que falta não é consciência, é tempo. O corpo reage antes de a decisão consciente entrar em cena.',
    hipotese: 'seu sistema aprendeu a reagir rápido como forma de proteção, e isso virou automático.',
    risco: 'continuar respondendo no piloto automático justamente nas situações que pedem pausa.',
    pratica: 'antes de reagir, três respirações completas — não para controlar, só para abrir uma fresta de escolha.',
  },
  decodificar: {
    intro:
      'Você já sente e já percebe o padrão se repetindo — o que falta é entender a raiz. Daí a sensação de "eu sei que faço isso, mas não sei por quê".',
    hipotese: 'o padrão tem uma função antiga que ainda não foi mapeada.',
    risco: 'repetir o ciclo por anos por falta desse mapa.',
    pratica:
      'quando o padrão aparecer, perguntar "a primeira vez que lembro de sentir isso foi quando?" — sem precisar responder agora, só observar.',
  },
  direcionar: {
    intro:
      'Você já entende a origem do padrão — o desafio agora é sustentar a mudança na prática, não só na cabeça.',
    hipotese: 'entendimento sem estrutura de ação vira insight que não se sustenta na rotina.',
    risco: 'ciclo de "eu sei o que preciso fazer" seguido de recaída, alimentando autocrítica.',
    pratica: 'escolher UMA situação específica para agir diferente — não a mudança inteira, só uma cena.',
  },
};

export function computeDominantStage(answers: Stage4D[]): Stage4D {
  const counts: Record<Stage4D, number> = { detectar: 0, desacelerar: 0, decodificar: 0, direcionar: 0 };
  for (const stage of answers) counts[stage] += 1;

  return STAGES.reduce((best, stage) => (counts[stage] > counts[best] ? stage : best));
}
