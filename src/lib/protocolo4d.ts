import { Fingerprint, Pause, KeyRound, ArrowRight } from 'lucide-react';

export const PILARES = [
  {
    icon: Fingerprint,
    titulo: 'Detectar',
    texto: 'Reconhecer o padrão que se repete — no trabalho, nas relações, no corpo — antes de tentar mudá-lo.',
    detalhe:
      'O primeiro passo não é mudar nada — é perceber. Antes de qualquer estratégia, é preciso enxergar com clareza a forma que se repete: onde ela aparece, em que situações se ativa, e o que dispara a mesma resposta de sempre.',
    exemplo:
      'Na prática: perceber que, toda vez que o parceiro se distancia um pouco, você inicia um conflito antes que ele "abandone primeiro" — e que isso não é um episódio isolado, é um ciclo que se repete sempre do mesmo jeito.',
  },
  {
    icon: Pause,
    titulo: 'Desacelerar',
    texto: 'Interromper a resposta automática o suficiente para olhar para o que está acontecendo de verdade.',
    detalhe:
      'Todo padrão automático acontece rápido demais para ser questionado no calor da hora. Desacelerar é criar esse intervalo — o espaço entre o gatilho e a reação — onde a escolha volta a ser possível.',
    exemplo:
      'Na prática: no momento exato em que a vontade de provocar o conflito aparece, sustentar alguns segundos antes de agir — o suficiente para que a resposta deixe de ser automática.',
  },
  {
    icon: KeyRound,
    titulo: 'Decodificar',
    texto: 'Entender de onde veio esse padrão e o que ele está tentando proteger ou conseguir.',
    detalhe:
      'Nenhum padrão existe à toa — ele nasceu resolvendo algo, em algum momento. Decodificar é entender essa origem e essa função, sem julgamento: o que essa forma sempre tentou garantir?',
    exemplo:
      'Na prática: entender que esse ciclo nasceu protegendo você de um abandono que já doeu antes — e que continua ativo hoje, mesmo quando a ameaça real já não é a mesma.',
  },
  {
    icon: ArrowRight,
    titulo: 'Direcionar',
    texto: 'Escolher, com essa clareza, um rumo diferente — na prática, não só na teoria.',
    detalhe:
      'Com o padrão detectado, desacelerado e decodificado, a última etapa é prática: experimentar uma resposta diferente da automática, de forma concreta, no lugar exato onde o padrão costumava agir sozinho.',
    exemplo:
      'Na prática: nomear o medo em vez de criar a briga — e observar como o outro responde diferente quando o ciclo muda a partir de você.',
  },
] as const;
