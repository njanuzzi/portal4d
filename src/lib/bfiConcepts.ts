// Conceitos fixos dos 5 fatores do Big Five — material de apoio da
// terapeuta (quadro "Os 5 fatores" em BFIResponseDetail), igual pra toda
// cliente. Não depende das respostas nem passa pela IA.
export interface BfiConcept {
  key: string;
  label: string;
  resumo: string;
  facetas: string[];
  maisPresente: string[];
  menosPresente: string[];
  explicarCliente: string;
  cuidados: string;
}

export const BFI_CONCEPTS: BfiConcept[] = [
  {
    key: 'extroversao',
    label: 'Extroversão',
    resumo:
      'Quanto a pessoa busca e se energiza com estímulos externos — principalmente interação social, atividade e emoções positivas.',
    facetas: ['Sociabilidade', 'Assertividade', 'Nível de energia', 'Busca de estímulos', 'Emoções positivas'],
    maisPresente: [
      'Inicia conversas e contatos com facilidade',
      'Expressa opiniões e participa ativamente',
      'Prefere ambientes movimentados e com pessoas',
      'Toma iniciativa em situações sociais',
    ],
    menosPresente: [
      'Prefere ambientes calmos e grupos pequenos',
      'Recarrega as energias em momentos a sós',
      'Fala mais quando tem algo específico a dizer',
      'Ritmo mais reservado, sem necessariamente timidez',
    ],
    explicarCliente:
      'Mostra de onde vem sua energia: mais de estar com pessoas e em movimento, ou mais de momentos calmos e com você mesma(o). Nenhum dos lados é melhor.',
    cuidados:
      'Introversão não é timidez nem ansiedade social. Extroversão alta não garante facilidade em reconhecer ou elaborar emoções.',
  },
  {
    key: 'amabilidade',
    label: 'Amabilidade',
    resumo:
      'Orientação para o outro nas relações: cooperação, confiança, consideração e disposição para preservar a harmonia.',
    facetas: ['Confiança', 'Altruísmo', 'Cooperação', 'Modéstia', 'Sensibilidade ao outro'],
    maisPresente: [
      'Coopera e cede para manter a harmonia',
      'Perdoa com facilidade e confia nas intenções alheias',
      'Atenção às necessidades dos outros',
      'Pode ter dificuldade em dizer não ou se posicionar',
    ],
    menosPresente: [
      'Mais disposição para discordar e questionar',
      'Comunicação mais direta, às vezes percebida como confrontativa',
      'Menor tendência a ceder só para evitar conflito',
      'Postura mais cética ou competitiva',
    ],
    explicarCliente:
      'Mostra como você equilibra o cuidado com os outros e a defesa das suas próprias posições — o quanto tende a ceder ou a se manter firme.',
    cuidados:
      'Amabilidade mais baixa não é agressividade, egoísmo nem falta de empatia. Amabilidade alta pode esconder dificuldade de impor limites.',
  },
  {
    key: 'conscienciosidade',
    label: 'Conscienciosidade',
    resumo: 'Forma de lidar com tarefas e objetivos: organização, disciplina, persistência e responsabilidade.',
    facetas: ['Organização', 'Autodisciplina', 'Senso de dever', 'Persistência', 'Planejamento'],
    maisPresente: [
      'Planeja, organiza e cumpre compromissos',
      'Persiste até concluir o que começa',
      'Orientação a metas de longo prazo',
      'Pode tender à autocobrança e ao perfeccionismo',
    ],
    menosPresente: [
      'Funcionamento mais espontâneo e flexível',
      'Dificuldade em manter rotinas e prazos',
      'Distância entre decidir e executar',
      'Distrai-se com facilidade',
    ],
    explicarCliente:
      'Mostra como você se organiza para fazer as coisas acontecerem — rotinas, prazos, persistência. Ajuda a entender o que facilita ou trava seus planos.',
    cuidados:
      'A média não diz qual faceta pesa mais (ex.: pode haver disciplina com pouca organização). Conscienciosidade alta não é sinônimo de bem-estar.',
  },
  {
    key: 'neuroticismo',
    label: 'Neuroticismo',
    resumo:
      'Tendência a experimentar emoções negativas — preocupação, ansiedade, irritação, tristeza — e vulnerabilidade ao estresse. O polo oposto é a estabilidade emocional.',
    facetas: ['Ansiedade', 'Irritabilidade', 'Tristeza', 'Autoconsciência / vergonha', 'Vulnerabilidade ao estresse'],
    maisPresente: [
      'Sente as emoções com intensidade',
      'Preocupa-se com frequência',
      'Demora a se recompor após conflitos ou frustrações',
      'Interpreta algumas situações como mais ameaçadoras',
    ],
    menosPresente: [
      'Mantém a calma sob pressão',
      'Recupera-se rápido de situações estressantes',
      'Menor tendência a preocupação excessiva',
      'Pode subestimar sinais de alerta',
    ],
    explicarCliente:
      'Para a cliente, chamar de "sensibilidade emocional": mostra o quanto as emoções difíceis te afetam e quanto tempo levam para passar. Não é diagnóstico — é um ponto a cuidar no processo.',
    cuidados:
      'Não é diagnóstico de ansiedade nem de depressão e não indica, sozinho, dificuldade clínica de regulação emocional. Pode refletir também o momento de vida (estado), não só traço.',
  },
  {
    key: 'abertura',
    label: 'Abertura à Experiência',
    resumo:
      'Receptividade a ideias, sensações e experiências novas: curiosidade intelectual, imaginação, sensibilidade estética e flexibilidade.',
    facetas: ['Imaginação', 'Curiosidade intelectual', 'Sensibilidade estética', 'Abertura a emoções', 'Flexibilidade de valores'],
    maisPresente: [
      'Curiosidade por ideias, arte e experiências novas',
      'Gosta de pensar profundamente e explorar caminhos diferentes',
      'Considera perspectivas variadas',
      'Responde bem a intervenções experienciais e reflexivas',
    ],
    menosPresente: [
      'Prefere o prático, concreto e conhecido',
      'Valoriza soluções já testadas',
      'Menor interesse por abstrações e novidades',
      'Responde melhor a abordagens mais estruturadas',
    ],
    explicarCliente:
      'Mostra o quanto você se abre ao novo — ideias, experiências, jeitos diferentes de ver as coisas — ou prefere o que já conhece e funciona.',
    cuidados:
      'Abertura não é inteligência. Abertura mais baixa, sozinha, não significa rigidez, conservadorismo ou resistência à mudança.',
  },
];
