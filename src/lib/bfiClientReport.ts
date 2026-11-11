import { BFIFactorScore } from './bfiFactors';

// Conteúdo da devolutiva do Big Five liberada pra cliente
// (client_bfi_published_reports.content). O texto inicial sai destes
// modelos e a terapeuta revisa/edita antes de liberar.
export interface BfiClientFactor {
  key: string;
  nome: string;
  average: number;
  descricao: string;
}

export interface BfiClientContent {
  fatores: BfiClientFactor[];
  conclusao: string;
}

type Level = 'baixa' | 'media' | 'alta';

// O BFI não tem pontos de corte validados pra população brasileira — estas
// faixas só escolhem qual texto de partida mostrar, não classificam a
// cliente. Por isso a linguagem fala em "mais/menos presente", nunca em
// "normal" ou "alterado".
function levelFor(average: number): Level {
  if (average < 2.5) return 'baixa';
  if (average > 3.5) return 'alta';
  return 'media';
}

// Nome amigável de cada fator pra cliente (Neuroticismo soa como
// diagnóstico fora do contexto técnico).
const CLIENT_NAMES: Record<string, string> = {
  extroversao: 'Extroversão',
  amabilidade: 'Amabilidade',
  conscienciosidade: 'Organização e persistência',
  neuroticismo: 'Sensibilidade emocional',
  abertura: 'Abertura a experiências',
};

const TEXTS: Record<string, Record<Level, string>> = {
  extroversao: {
    alta: 'Você tende a buscar a companhia de outras pessoas e a se energizar com conversas, movimento e novidades. Costuma se expressar com facilidade e trazer entusiasmo para os ambientes em que está.',
    media: 'Você transita entre momentos de mais contato social e momentos de recolhimento. Consegue se expressar quando precisa, mas também valoriza seu espaço e seu ritmo.',
    baixa: 'Você tende a preferir ambientes mais calmos e relações mais próximas e selecionadas. Costuma recarregar as energias em momentos a sós, e isso é uma forma legítima de funcionar.',
  },
  amabilidade: {
    alta: 'Você tende a ser cuidadoso(a) com as pessoas, cooperativo(a) e disposto(a) a perdoar. Vale observar se esse cuidado com o outro também deixa espaço para as suas próprias necessidades.',
    media: 'Você costuma equilibrar a consideração pelos outros com a defesa dos seus próprios interesses, cooperando quando faz sentido e se posicionando quando necessário.',
    baixa: 'Você tende a ser mais direto(a) e crítico(a), priorizando a sinceridade e os próprios critérios nas relações. Isso pode trazer clareza, e às vezes também atritos que valem ser olhados com cuidado.',
  },
  conscienciosidade: {
    alta: 'Você tende a ser organizado(a), persistente e comprometido(a) com o que começa. Vale observar se essa exigência consigo mesmo(a) às vezes vira cobrança excessiva.',
    media: 'Você consegue se organizar e concluir tarefas, com alguma flexibilidade. Em alguns momentos a disciplina flui; em outros, a distração ou o cansaço pesam mais.',
    baixa: 'Você tende a funcionar de forma mais espontânea e flexível, e manter rotinas, prazos e organização pode exigir mais esforço. Esse é um ponto que podemos trabalhar com estratégias práticas.',
  },
  neuroticismo: {
    alta: 'Você tende a sentir as emoções com intensidade e pode se preocupar ou ficar tenso(a) com facilidade, especialmente em situações de pressão. Essa sensibilidade é um ponto importante para cuidarmos no processo.',
    media: 'Você sente as emoções de forma presente, mas em geral consegue se recompor depois de situações estressantes. Alguns contextos podem mexer mais com você do que outros.',
    baixa: 'Você tende a se manter mais calmo(a) e estável diante de pressões e imprevistos, com menos tendência a se preocupar em excesso.',
  },
  abertura: {
    alta: 'Você tende a ser curioso(a), criativo(a) e interessado(a) por ideias, arte e experiências novas. Gosta de pensar profundamente e de explorar caminhos diferentes.',
    media: 'Você combina curiosidade por coisas novas com apreço pelo que já conhece. Se abre a novidades quando elas fazem sentido para você.',
    baixa: 'Você tende a preferir o que é prático, concreto e conhecido. Valoriza estabilidade e caminhos já testados mais do que a novidade pela novidade.',
  },
};

const DEFAULT_CONCLUSAO =
  'Esses resultados não são um diagnóstico nem um rótulo — são um retrato de como você se percebe hoje em cinco ' +
  'grandes dimensões da personalidade. Nenhum traço é melhor ou pior: cada um traz recursos e desafios. ' +
  'Vamos usar este retrato como ponto de partida para conversarmos no nosso processo.';

export function buildBfiClientContent(scores: BFIFactorScore[]): BfiClientContent {
  return {
    fatores: scores.map((score) => ({
      key: score.key,
      nome: CLIENT_NAMES[score.key] ?? score.label,
      average: Math.round(score.average * 100) / 100,
      descricao: TEXTS[score.key]?.[levelFor(score.average)] ?? '',
    })),
    conclusao: DEFAULT_CONCLUSAO,
  };
}
