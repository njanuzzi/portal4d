import { Compass, Pause, KeyRound, ArrowRight } from 'lucide-react';

export const PILARES = [
  {
    icon: Compass,
    titulo: 'Detectar',
    texto: 'Reconhecer o padrão que se repete — no trabalho, nas relações, no corpo — antes de tentar mudá-lo.',
    detalhe:
      'O primeiro passo não é mudar nada — é perceber. Antes de qualquer estratégia, é preciso enxergar com clareza a forma que se repete: onde ela aparece, em que situações se ativa, e o que dispara a mesma resposta de sempre.',
  },
  {
    icon: Pause,
    titulo: 'Desacelerar',
    texto: 'Interromper a resposta automática o suficiente para olhar para o que está acontecendo de verdade.',
    detalhe:
      'Todo padrão automático acontece rápido demais para ser questionado no calor da hora. Desacelerar é criar esse intervalo — o espaço entre o gatilho e a reação — onde a escolha volta a ser possível.',
  },
  {
    icon: KeyRound,
    titulo: 'Decodificar',
    texto: 'Entender de onde veio esse padrão e o que ele está tentando proteger ou conseguir.',
    detalhe:
      'Nenhum padrão existe à toa — ele nasceu resolvendo algo, em algum momento. Decodificar é entender essa origem e essa função, sem julgamento: o que essa forma sempre tentou garantir?',
  },
  {
    icon: ArrowRight,
    titulo: 'Direcionar',
    texto: 'Escolher, com essa clareza, um rumo diferente — na prática, não só na teoria.',
    detalhe:
      'Com o padrão detectado, desacelerado e decodificado, a última etapa é prática: experimentar uma resposta diferente da automática, de forma concreta, no lugar exato onde o padrão costumava agir sozinho.',
  },
] as const;
