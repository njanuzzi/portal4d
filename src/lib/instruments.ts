// Lista de instrumentos que podem ser respondidos via link individual por
// cliente (ver InstrumentInvite.tsx). Pra adicionar um novo instrumento no
// futuro: criar a página pública em src/pages/, aceitar "?token=" nela igual
// SchemaQuestionnaire/SMIQuestionnaire/BFIQuestionnaire/MARQQuestionnaire,
// aceitar "invite_token" na edge function de start, e adicionar uma entrada
// aqui — nada mais precisa mudar na tela de Instrumentos.
//
// `documentation` é opcional e alimenta a seção "Sobre este instrumento" na
// tela de Instrumentos (descrição clínica + fórmula de cada escala) — só
// preenchemos quando temos o texto de referência do próprio instrumento (não
// inventamos conteúdo clínico). Instrumentos sem `documentation` simplesmente
// não mostram essa seção.
export interface InstrumentScaleDoc {
  label: string;
  formula: string;
  hasCutoffs: boolean;
}

export interface InstrumentDocumentation {
  badge?: string;
  tags: string[];
  overview: string;
  applicationTime?: string;
  targetPopulation?: string;
  recommendedUses?: string[];
  interpretation?: string;
  patientInstructions?: string;
  developers?: string;
  references?: string;
  scales: InstrumentScaleDoc[];
}

export interface InstrumentConfig {
  key: string;
  label: string;
  description: string;
  path: string;
  documentation?: InstrumentDocumentation;
}

export const INSTRUMENTS: InstrumentConfig[] = [
  {
    key: 'esquemas',
    label: 'Formulário de Esquemas (YSQ)',
    description: 'Mapeamento de Padrões — 205 perguntas sobre esquemas emocionais.',
    path: '/questionario-esquemas',
    documentation: {
      // Atenção: a versão implementada aqui é o YSQ Formulário Longo (205
      // itens, 16 domínios com nomes humanizados) — NÃO o YSQ-S3 (versão
      // curta, 90 itens, 5 domínios/18 subfatores). As fórmulas abaixo
      // vêm direto de schema_domains/schema_questions (fonte de verdade),
      // não de um texto de referência do S3, que teria numeração
      // incompatível. Por isso não há developers/references aqui — não
      // confirmamos a citação acadêmica exata desta tradução/versão de
      // 205 itens, e preferimos deixar em branco a citar algo incerto.
      badge: 'Escala Padronizada',
      tags: ['Esquemas'],
      overview:
        'O Questionário de Esquemas de Young (YSQ) avalia Esquemas Iniciais Desadaptativos (EID) — padrões ' +
        'emocionais e cognitivos estáveis que se desenvolvem precocemente e se associam a diversas ' +
        'psicopatologias, especialmente em transtornos de personalidade. Esses esquemas organizam o sentido que a ' +
        'pessoa dá às experiências e mantêm padrões emocionais e comportamentais desadaptativos. A versão ' +
        'implementada neste portal ("Mapeamento de Padrões") tem 205 itens organizados em 16 domínios, cada um ' +
        'com um nome em linguagem acessível ao cliente.',
      targetPopulation: 'Adultos da população geral',
      recommendedUses: [
        'Contextos clínicos de triagem psicológica ampliada (mapeamento de padrões de personalidade e vulnerabilidades)',
        'Formulação de caso em Terapia do Esquema',
        'Pesquisas sobre esquemas, personalidade e psicopatologia',
      ],
      interpretation:
        `1. Estrutura do instrumento
205 itens, organizados em 16 domínios (ver a lista de Escalas abaixo). Escala de resposta Likert de 1 a 6 (1 = "Completamente falso sobre mim" a 6 = "Me descreve perfeitamente").

2. Pontuação e faixas de interpretação (cutoffs)
A pontuação de cada domínio é a média dos itens que o compõem. A literatura sobre o YSQ sugere heuristicamente que escores até 4 indicam esquema relativamente desativado, e escores acima de 4 indicam esquema mais ativado — mas não há pontos de corte validados para a população brasileira nesta versão de 205 itens. Escores mais altos indicam maior ativação do esquema, maior rigidez da crença e maior probabilidade dos padrões emocionais/comportamentais associados; escores mais baixos sugerem que o esquema é pouco saliente ou pouco ativado no momento. Importante: escores elevados não indicam que a pessoa "tem" um esquema — é uma característica que pode ou não estar ativada num dado momento.

3. Cuidados éticos e limitações de aplicação
Não usar isoladamente para diagnóstico — sempre complementar com entrevista clínica, observação e outros instrumentos. Interpretar de forma idiográfica (individualizada) e, quando possível, longitudinal.

4. Sugestões para análise clínica
Identificar os domínios com escores mais elevados (em geral os 3-5 mais altos) e articulá-los com a história de desenvolvimento do cliente (necessidades não atendidas), estilos de enfrentamento predominantes (evitação, supercompensação, rendição) e sintomas atuais, para orientar hipóteses de formulação de caso e o plano terapêutico.`,
      patientInstructions:
        'A seguir há uma lista de afirmações que as pessoas podem utilizar para descrever a si mesmas. Leia cada ' +
        'afirmação e classifique-a baseando-se em quão bem ela descreve você ao longo do último ano. Quando você ' +
        'não tiver certeza, baseie sua resposta nos seus sentimentos, e não no que você acredita racionalmente ' +
        'que é verdade.',
      scales: [
        { label: 'Sentir que o cuidado emocional nunca é suficiente', formula: 'Resultado calculado através da média das questões 1, 2, 3, 4, 5, 6, 7, 8, 9.', hasCutoffs: false },
        { label: 'Medo de perder ou ser abandonado pelas pessoas importantes', formula: 'Resultado calculado através da média das questões 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27.', hasCutoffs: false },
        { label: 'Esperar que as pessoas vão te machucar ou se aproveitar', formula: 'Resultado calculado através da média das questões 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44.', hasCutoffs: false },
        { label: 'Sentir que não pertence a nenhum grupo', formula: 'Resultado calculado através da média das questões 45, 46, 47, 48, 49, 50, 51, 52, 53, 54.', hasCutoffs: false },
        { label: 'Sentir que, no fundo, tem algo "errado" em você', formula: 'Resultado calculado através da média das questões 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69.', hasCutoffs: false },
        { label: 'Achar que não é atraente ou bem-aceito em grupo', formula: 'Resultado calculado através da média das questões 70, 71, 72, 73, 74, 75, 76, 77, 78.', hasCutoffs: false },
        { label: 'Sentir que não está à altura, em comparação com os outros', formula: 'Resultado calculado através da média das questões 79, 80, 81, 82, 83, 84, 85, 86, 87.', hasCutoffs: false },
        { label: 'Sentir que não dá conta das coisas sozinho', formula: 'Resultado calculado através da média das questões 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102.', hasCutoffs: false },
        { label: 'Medo de que algo ruim aconteça a qualquer momento', formula: 'Resultado calculado através da média das questões 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116.', hasCutoffs: false },
        { label: 'Dificuldade em se sentir separado dos outros', formula: 'Resultado calculado através da média das questões 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127.', hasCutoffs: false },
        { label: 'Ceder ao que os outros querem pra evitar conflito', formula: 'Resultado calculado através da média das questões 128, 129, 130, 131, 132, 133, 134, 135, 136, 137.', hasCutoffs: false },
        { label: 'Cuidar demais dos outros e pouco de você mesmo', formula: 'Resultado calculado através da média das questões 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154.', hasCutoffs: false },
        { label: 'Segurar suas emoções pra não perder o controle ou incomodar', formula: 'Resultado calculado através da média das questões 155, 156, 157, 158, 159, 160, 161, 162, 163.', hasCutoffs: false },
        { label: 'Cobrança alta demais consigo mesmo', formula: 'Resultado calculado através da média das questões 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179.', hasCutoffs: false },
        { label: 'Dificuldade em aceitar limites ou regras que valem pra todo mundo', formula: 'Resultado calculado através da média das questões 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190.', hasCutoffs: false },
        { label: 'Dificuldade em manter constância e lidar com frustração', formula: 'Resultado calculado através da média das questões 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205.', hasCutoffs: false },
      ],
    },
  },
  {
    key: 'smi',
    label: 'Inventário de Modos Esquemáticos (SMI)',
    description: '124 perguntas sobre frequência de modos emocionais.',
    path: '/questionario-modos',
    documentation: {
      badge: 'Escala Padronizada',
      tags: ['Esquemas'],
      overview:
        'O Inventário de Modos Esquemáticos (SMI) é um instrumento de autorrelato destinado a avaliar a ' +
        'frequência de ativação de 14 modos esquemáticos, segundo o modelo da Terapia do Esquema (TE). Os modos ' +
        'esquemáticos representam estados emocionais, cognitivos e comportamentais ativados em resposta a ' +
        'situações-gatilho e associados a Esquemas Iniciais Desadaptativos e estratégias de enfrentamento.',
      applicationTime: 'Aproximadamente 20 a 30 minutos',
      targetPopulation: 'Adultos (≥18 anos)',
      recommendedUses: [
        'Triagem clínica ampliada da dinâmica de modos predominantes',
        'Psicodiagnóstico clínico, especialmente em contextos relacionados a Transtornos da Personalidade',
        'Formulação de caso baseada em modos',
        'Planejamento e monitoramento terapêutico em Terapia do Esquema',
        'Pesquisa sobre modos e psicopatologia',
      ],
      interpretation:
        `1. Estrutura do instrumento
Número total de itens: 124 itens. Tipo de resposta: escala Likert de 1 a 6 (1 = "nunca ou quase nunca" a 6 = "o tempo todo"). Organização: 14 modos esquemáticos.

2. Descrição das subescalas, dimensões ou fatores
Modos Criança: Criança Vulnerável (medo, abandono, tristeza, desamparo), Criança Zangada (percepção de injustiça por necessidades não atendidas), Criança Raivosa (indignação, dificuldade de controlar emoções e impulsos), Criança Impulsiva (busca imediata por prazer, baixa tolerância à frustração), Criança Indisciplinada (dificuldade de planejamento, procrastinação), Criança Feliz (sentir-se leve e espontâneo, necessidades emocionais atendidas).
Modos de Enfrentamento Disfuncionais: Capitulador Complacente (submissão, passividade), Protetor Desligado (desligamento emocional, evitação), Autoconfortador Desligado (uso de comportamentos autoapaziguadores pra reduzir emoções intensas).
Modos Hipercompensadores: Autoengrandecedor (grandiosidade, sentir-se superior), Intimidação e Ataque (dominação, ameaças e agressões pra evitar ser controlado).
Modos Pais Internalizados: Pais Punitivos (vozes internalizadas agressivas e depreciativas), Pais Exigentes/Críticos (padrões de exigência rígidos, hipervigilância a erros).
Modo Adulto Saudável: Adulto Saudável (integração equilibrada das demandas internas e externas, compaixão e respeito aos limites).

3. Pontuação e faixas de interpretação (cutoffs)
A pontuação é obtida calculando-se a média dos escores dos itens em cada modo esquemático. Escores mais altos indicam maior frequência de ativação do modo. Não há pontos de corte validados pra população brasileira.

4. Mudança clínica e sensibilidade
Nenhum dos estudos fornece RCI, MCID, ou parâmetros explícitos de sensibilidade à mudança. Pode ser reaplicado em intervalos de 8-12 semanas, seguindo práticas da Terapia do Esquema.

5. Cuidados éticos e limitações de aplicação
Não deve ser usado isoladamente para diagnóstico. Requer entrevista clínica e avaliação complementar de esquemas e coping. Pode ser mal interpretado sem formação em Terapia do Esquema — recomenda-se uso apenas por psicólogos clínicos treinados.

6. Sugestões para análise clínica
Permite identificar vulnerabilidades centrais, mecanismos disfuncionais dominantes (evitação, hipercompensação, resignação) e modos críticos no ciclo de manutenção do sofrimento. Ao interpretar, avalie não apenas os 14 modos separadamente, mas a categoria maior à qual eles fazem parte. Relações entre modos valem observar: Criança Vulnerável + Protetor Distanciado (hiporregulação + evitação); Criança Impulsiva + Criança Raivosa (impulsividade + externalização agressiva); Punitivo + Criança Vulnerável (ciclos de autocrítica e retraimento).`,
      patientInstructions:
        'Este questionário possui afirmações que as pessoas podem usar para descrever a si mesmas. Baseando-se na ' +
        'escala de frequência, avalie cada item escolhendo a opção que melhor descreve a frequência com que você ' +
        'sente que cada afirmação se aplica a você. Ao responder cada questão, pergunte a si mesmo: "Em geral, ' +
        'com que frequência esta frase se aplica a mim?"',
      developers:
        'Lobbestael, J., van Vreeswijk, M., Spinhoven, P., Schouten, E., & Arntz, A. (2010). Reliability and ' +
        'validity of the short Schema Mode Inventory (SMI). Behavioural and Cognitive Psychotherapy, 38(4), ' +
        '437-458. https://doi.org/10.1017/S1352465810000226 — Young, J. E., Arntz, A., Atkinson, T., Lobbestael, ' +
        'J., Weishaar, M. E., Van Vreeswijk, M. F., & Klokman, J. (2007). The schema mode inventory. New York: ' +
        'Schema Therapy Institute.',
      references:
        'Damasceno, E. S. (2020). Adaptação e evidências de validade do Inventário de Modos Esquemáticos (Schema ' +
        'Mode Inventory – SMI) para população brasileira [Dissertação de Mestrado, Pontifícia Universidade ' +
        'Católica do Rio Grande do Sul]. A implementação do instrumento foi realizada mediante aprovação da Dra. ' +
        'Margareth Oliveira, coordenadora do Grupo de Avaliação e Acompanhamento Psicológico em Contextos ' +
        'Clínicos (GAAPCC), responsável pelos estudos de validação (https://www.gaapcc.com/).',
      scales: [
        { label: 'Criança Vulnerável', formula: 'Resultado calculado através da média das questões 4, 6, 36, 50, 67, 71, 105, 106, 111, 119.', hasCutoffs: false },
        { label: 'Criança Zangada', formula: 'Resultado calculado através da média das questões 22, 42, 47, 49, 56, 63, 76, 79, 103, 109.', hasCutoffs: false },
        { label: 'Criança Raivosa', formula: 'Resultado calculado através da média das questões 14, 25, 26, 46, 54, 60, 92, 98, 101, 123.', hasCutoffs: false },
        { label: 'Criança Impulsiva', formula: 'Resultado calculado através da média das questões 12, 15, 35, 40, 66, 69, 78, 97, 110.', hasCutoffs: false },
        { label: 'Criança Indisciplinada', formula: 'Resultado calculado através da média das questões 13, 21, 30, 65, 70, 107.', hasCutoffs: false },
        { label: 'Criança Feliz', formula: 'Resultado calculado através da média das questões 2, 17, 19, 48, 61, 68, 95, 96, 113, 122.', hasCutoffs: false },
        { label: 'Capitulador Complacente', formula: 'Resultado calculado através da média das questões 8, 18, 37, 38, 55, 100, 108.', hasCutoffs: false },
        { label: 'Protetor Desligado', formula: 'Resultado calculado através da média das questões 28, 33, 34, 39, 43, 59, 64, 75, 88.', hasCutoffs: false },
        { label: 'Autoconfortador Desligado', formula: 'Resultado calculado através da média das questões 41, 52, 57, 86.', hasCutoffs: false },
        { label: 'Autoengrandecedor', formula: 'Resultado calculado através da média das questões 10, 11, 27, 31, 44, 74, 81, 89, 91, 114.', hasCutoffs: false },
        { label: 'Intimidação e Ataque', formula: 'Resultado calculado através da média das questões 1, 24, 32, 53, 77, 93, 99, 102, 112.', hasCutoffs: false },
        { label: 'Pais Punitivos', formula: 'Resultado calculado através da média das questões 3, 5, 9, 16, 58, 72, 84, 87, 94, 118.', hasCutoffs: false },
        { label: 'Pais Exigentes/Críticos', formula: 'Resultado calculado através da média das questões 7, 23, 45, 51, 82, 83, 90, 104, 115, 116.', hasCutoffs: false },
        { label: 'Adulto Saudável', formula: 'Resultado calculado através da média das questões 20, 29, 62, 73, 80, 85, 117, 120, 121, 124.', hasCutoffs: false },
      ],
    },
  },
  {
    key: 'bfi',
    label: 'Big Five Inventory (BFI)',
    description: '25 perguntas sobre os cinco grandes fatores de personalidade.',
    path: '/questionario-bigfive',
    documentation: {
      badge: 'Escala Padronizada',
      tags: ['Personalidade'],
      overview:
        'O Big Five Inventory (BFI), em sua versão brasileira, é um instrumento de autorrelato destinado a ' +
        'mensurar os cinco grandes fatores de personalidade (Big Five): Extroversão, Amabilidade, ' +
        'Conscienciosidade, Neuroticismo e Abertura à Experiência. O BFI é uma alternativa gratuita para ' +
        'investigação de personalidade em pesquisa e em interfaces psiquiatria-psicologia (ex.: estudos sobre ' +
        'associações entre traços e psicopatologia/bem-estar).',
      applicationTime: '10 a 12 minutos',
      targetPopulation: 'Adultos (>18 anos)',
      recommendedUses: [
        'Avaliação dimensional de traços de personalidade em contextos de triagem psicológica e formulação de caso',
        'Relacionar traços a hipóteses transdiagnósticas, planejamento terapêutico e compreensão de dificuldades recorrentes',
        'Pesquisa e interfaces com saúde mental (ex.: estudos de associação entre traços e indicadores clínicos)',
      ],
      interpretation:
        `1. Estrutura do instrumento
Número total de itens: 25 itens. Tipo de resposta: escala Likert de 1 a 5 ("discordo totalmente" a "concordo totalmente"). Organização: 5 fatores — Extroversão, Amabilidade, Conscienciosidade, Neuroticismo e Abertura à Experiência.

2. Descrição das subescalas, dimensões ou fatores
Extroversão: sociabilidade, energia, expressão/afirmação interpessoal. Amabilidade: tendências pró-sociais, cooperação, gentileza e perdão. Conscienciosidade: organização, autodisciplina, persistência e manejo de metas. Neuroticismo: instabilidade emocional, tendência a preocupação, tensão e reatividade ao estresse. Abertura à Experiência: curiosidade, imaginação, pensamento abstrato/reflexivo e interesse estético/intelectual.

3. Pontuação e faixas de interpretação (cutoffs)
O estudo não apresenta pontos de corte validados. Médias mais altas correspondem a características mais representativas dentro de cada fator.

4. Mudança clínica e sensibilidade
Embora haja menção a teste-reteste em piloto (n=46), o artigo não reporta coeficientes de estabilidade, RCI ou MCID — não sustenta uso como medida de desfecho terapêutico (monitoramento).

5. Cuidados éticos e limitações de aplicação
Não deve ser usado isoladamente para decisões diagnósticas — o BFI mede traços dimensionais e deve ser integrado a entrevista clínica, histórico, funcionamento e outros instrumentos. Limitações amostrais do estudo original (amostra de conveniência, predominância de mulheres e região Nordeste) limitam generalizações normativas.

6. Sugestões para análise clínica
Neuroticismo alto: maior risco de reatividade emocional, preocupação e estresse — pode orientar foco em regulação emocional e manejo de ansiedade. Conscienciosidade baixa: dificuldades de planejamento/aderência — pode orientar organização de hábitos e rotinas. Extroversão baixa: risco de retraimento social — pode orientar avaliação de rede de apoio e exposição gradual. Amabilidade baixa: potenciais conflitos interpessoais — útil para mapear padrões relacionais, evitando conclusões moralizantes. Abertura alta/baixa: pode influenciar responsividade a intervenções (maior abertura favorece técnicas experiencial-reflexivas; menor abertura favorece abordagens mais estruturadas).`,
      patientInstructions:
        'A seguir você verá características que podem ou não se aplicar a você. Por exemplo, você concorda que é ' +
        'alguém que gosta de passar tempo com outros? Por favor selecione a opção que melhor se aproxima a cada ' +
        'declaração, indicando a extensão que você concorda ou discorda dela.',
      developers:
        'John, O. P., Donahue, E. M., & Kentle, R. L. (1991). The Big Five Inventory - Versions 4a and 54. ' +
        'Berkeley, CA: University of California, Berkeley, Institute of Personality and Social Research.',
      references:
        'Roiz Junior, P. R. S., da Silveira, D. X., Barbosa, P. C. R., Torres, M. A. D. S., Moreira Junior, E. D. ' +
        'C., Areco, K. C. N., ... & Kasinski, S. K. (2023). Psychometric properties of the Brazilian version of ' +
        'the Big Five Inventory. Trends in Psychiatry and Psychotherapy, 45, e20210458. ' +
        'https://doi.org/10.47626/2237-6089-2021-0458',
      scales: [
        { label: 'Extroversão', formula: 'Resultado calculado através da média das questões 1, 7, 10, 17.', hasCutoffs: false },
        { label: 'Amabilidade', formula: 'Resultado calculado através da média das questões 3, 11, 19, 23.', hasCutoffs: false },
        { label: 'Conscienciosidade', formula: 'Resultado calculado através da média das questões 4, 12, 14, 18, 24.', hasCutoffs: false },
        { label: 'Neuroticismo', formula: 'Resultado calculado através da média das questões 5, 8, 13, 15, 20, 21.', hasCutoffs: false },
        { label: 'Abertura à Experiência', formula: 'Resultado calculado através da média das questões 2, 6, 9, 16, 22, 25.', hasCutoffs: false },
      ],
    },
  },
  {
    key: 'marq',
    label: 'Escala de Amor do MARQ',
    description: '9 perguntas sobre vínculo emocional e amor romântico no relacionamento.',
    path: '/questionario-marq',
    documentation: {
      badge: 'Escala Padronizada',
      tags: ['Relacionamento'],
      overview:
        'A Escala de Amor do Marriage and Relationships Questionnaire (MARQ) – Brasil é uma medida breve de ' +
        'vínculo emocional/amor romântico entre parceiros em relacionamento estável. Ela deriva do MARQ original, ' +
        'desenvolvido por Russell e Wells na década de 1980, cujo foco é avaliar múltiplos aspectos de ' +
        'relacionamentos conjugais. A Escala Amor corresponde a um subconjunto de 9 itens do MARQ, especificamente ' +
        'desenhado para captar o nível de apego afetivo, proximidade emocional e satisfação global com o parceiro ' +
        'e com o relacionamento.',
      applicationTime: '3 a 5 minutos',
      targetPopulation: 'Adultos em relacionamento amoroso estável e convivendo com o parceiro',
      recommendedUses: [
        'Caracterização do vínculo afetivo conjugal em triagem ou psicodiagnóstico de casais',
        'Suporte à formulação de caso em terapia de casal ou familiar',
        'Variável de resultado em pesquisas e avaliações de intervenções voltadas à relação conjugal',
      ],
      interpretation:
        `1. Estrutura do instrumento
Número total de itens: 9 itens. Tipo de resposta: escala linear de 1 a 5 (1 = Nem um pouco a 5 = Muito). Organização: unidimensional (vínculo emocional/amor romântico).

2. Descrição das subescalas, dimensões ou fatores
Fator único — vínculo emocional/amor romântico: um contínuo de envolvimento afetivo positivo, proximidade, carinho e valorização do parceiro, integrando satisfação global com o relacionamento, atração física e carinho, respeito e orgulho, romantismo e intensidade do amor declarado.

3. Pontuação e faixas de interpretação (cutoffs)
Soma-se a pontuação dos 9 itens e divide-se por 9 para obter a média (escore global) — valores possíveis de 1,00 a 5,00. Média da amostra normativa do estudo: M = 4,33; DP = 0,46. O estudo não apresenta pontos de corte validados (cutoffs clínicos); qualquer categorização (baixo/médio/alto) deve ser considerada heurística e adaptada ao contexto, idealmente comparando o próprio indivíduo ao longo do tempo. Escores altos indicam forte apego emocional e satisfação geral com a relação; escores baixos indicam fragilidade do vínculo afetivo e possível afastamento emocional.

4. Mudança clínica e sensibilidade
O estudo não apresenta dados de teste-reteste, sensibilidade à mudança, RCI ou MCID. Por ser uma escala curta e de um único fator, é tecnicamente possível reaplicá-la para monitorar a evolução do vínculo afetivo ao longo da terapia de casal (ex: a cada 4-8 sessões), mas esse uso ainda não é validado empiricamente — recomenda-se interpretar mudanças de escore sempre junto com relato qualitativo do casal, eventos de vida e outras medidas.

5. Cuidados éticos e limitações de aplicação
Não deve ser usado isoladamente para diagnosticar "falta de amor" ou justificar decisões de separação, guarda ou questões legais — deve ser sempre complementado por entrevista clínica individual e conjunta e análise do contexto. Limitações de amostra: amostra de conveniência relativamente pequena, apenas casais heterossexuais coabitantes, escolaridade majoritariamente alta — a extrapolação para outras populações deve ser feita com cautela.

6. Sugestões para análise clínica
Escores mais baixos podem sugerir redução de intimidade, diminuição de carinho/contato físico ou desvalorização do parceiro. Escores altos com queixas de conflito pontual podem indicar vínculo preservado com dificuldades pontuais de comunicação ou manejo de estresse externo. Na inspeção item a item: itens 1 e 4 (companhia, fazer coisas juntos) apontam pra tempo de qualidade e interesses comuns; itens 3, 5 e 8 (atração, contato físico, romantismo) apontam pra intimidade física; itens 6 e 7 (respeito, orgulho) apontam pra reconhecimento e comunicação não violenta; itens 2 e 9 (felicidade geral, intensidade do amor) servem como indicadores primários de meta terapêutica.`,
      patientInstructions:
        'Por favor, leia as perguntas a seguir e responda de acordo com a escala. Observe que 1 significa "Nem um ' +
        'pouco" e 5 significa "Muito". Considere seu relacionamento atual para responder.',
      developers:
        'Russell, R. J. H., & Wells, P. A. (1986). Marriage questionnaire. Unpublished booklet. Russell, R. J. H., ' +
        '& Wells, P. A. (1993). Marriage and relationships questionnaire: MARQ handbook. Kent, UK: Hodder and Stoughton.',
      references:
        'França, P. S. D., Natividade, J. C., & Lopes, F. D. A. (2016). Evidências de validade da versão ' +
        'brasileira da escala amor do Marriage and Relationships Questionnaire (MARQ). Psico-USF, 21(2), 233-244. ' +
        'https://doi.org/10.1590/1413-82712016210202',
      scales: [
        {
          label: 'Escala global',
          formula: 'A escala global será a soma da pontuação de todas as questões.',
          hasCutoffs: false,
        },
        {
          label: 'Escore total',
          formula: 'Resultado calculado através da média das questões 1, 2, 3, 4, 5, 6, 7, 8, 9.',
          hasCutoffs: false,
        },
      ],
    },
  },
  {
    key: 'rbs',
    label: 'Escala de Crenças Românticas (RBS)',
    description: '13 perguntas sobre crenças cognitivas idealizadas do amor romântico.',
    path: '/questionario-rbs',
    documentation: {
      badge: 'Escala Padronizada',
      tags: ['Relacionamento'],
      overview:
        'A Romantic Beliefs Scale (RBS) foi desenvolvida para avaliar crenças cognitivas sobre o romantismo e o ' +
        'amor romântico ideal, entendidas como esquemas que orientam expectativas, interpretações e comportamentos ' +
        'em relacionamentos amorosos. O instrumento fundamenta-se na concepção de que o romantismo constitui uma ' +
        'ideologia composta por crenças relativamente estáveis, tais como a existência de um "amor verdadeiro", a ' +
        'ideia de perfeição do vínculo amoroso e a noção de que o amor supera quaisquer obstáculos. Essas crenças ' +
        'podem influenciar a formação, manutenção, satisfação e comprometimento em relacionamentos românticos.',
      applicationTime: '5 minutos',
      targetPopulation: 'Adultos (≥18 anos)',
      recommendedUses: [
        'Triagem de crenças românticas idealizadas',
        'Apoio à formulação de caso em psicoterapia individual ou de casal',
        'Monitoramento cognitivo ao longo de intervenções focadas em expectativas e esquemas relacionais',
        'Pesquisa em psicologia social, clínica e da personalidade',
      ],
      interpretation:
        `1. Estrutura do instrumento
Número total de itens: 13 itens. Tipo de resposta: escala de frequência de 7 pontos (1 = "Discordo fortemente" a 7 = "Concordo fortemente"). Organização: 4 subescalas (Amor encontra uma maneira; Um e único; Idealização; Amor à primeira vista).

2. Descrição das subescalas, dimensões ou fatores
Amor encontra uma maneira: crença de que o amor supera quaisquer barreiras e obstáculos (familiares, sociais, circunstanciais). Um e único: crença na existência de uma única pessoa destinada a ser o "verdadeiro amor". Idealização: crença de que o relacionamento com o amor verdadeiro será perfeito ou quase. Amor à primeira vista: crença de que o amor verdadeiro pode ser reconhecido imediatamente, antes de interação significativa.

3. Pontuação e faixas de interpretação (cutoffs)
Pontuação pela média dos itens por fator, podendo-se calcular também a média geral (fator de segunda ordem) — intervalo possível de 1 a 7. O estudo não apresenta pontos de corte validados; a interpretação deve ser dimensional e comparativa (intraindivíduo e entre fatores).
- Amor encontra uma maneira alto: persistência relacional, mas também risco de tolerar relações disfuncionais ou abusivas em nome do ideal romântico. Baixo: maior consideração de limites contextuais e pessoais.
- Um e único alto: tendência a exclusividade emocional rígida, possível dificuldade em elaborar términos ou aceitar alternativas relacionais. Baixo: maior flexibilidade cognitiva quanto a vínculos amorosos.
- Idealização alta: expectativas elevadas, risco de frustração, conflitos conjugais e manutenção de relações insatisfatórias por idealização. Baixa: expectativas mais realistas e tolerância a imperfeições.
- Amor à primeira vista alto: impulsividade afetiva, decisões relacionais rápidas; pode associar-se a maior extroversão. Baixo: maior valorização do conhecimento gradual do parceiro.

4. Mudança clínica e sensibilidade
A RBS-Brasil pode ser reaplicada para monitoramento cognitivo, porém o estudo não apresenta dados de sensibilidade à mudança clínica, RCI ou MCID. Recomenda-se cautela ao interpretar variações de escores como mudança terapêutica significativa.

5. Cuidados éticos e limitações de aplicação
Não deve ser utilizada isoladamente para diagnóstico — recomenda-se integração com entrevista clínica e outros instrumentos (ex.: satisfação conjugal, crenças disfuncionais de relacionamento). Alguns fatores apresentam consistência interna moderada (α ≈ 0,61), especialmente Idealização e Amor à primeira vista, exigindo interpretação cuidadosa.

6. Sugestões para análise clínica
Escores elevados em Idealização e Amor encontra uma maneira podem orientar intervenções focadas em flexibilização cognitiva, psicoeducação sobre expectativas realistas e estabelecimento de limites relacionais. Um e único elevado pode sinalizar dificuldades em luto amoroso, dependência emocional ou esquemas de exclusividade rígida. Amor à primeira vista elevado pode ser explorado em conjunto com impulsividade, tomada de decisão e padrões repetitivos de escolha de parceiros. A combinação da RBS-Brasil com medidas de satisfação conjugal e investimento emocional pode enriquecer a formulação de caso e o planejamento terapêutico.`,
      patientInstructions: 'A seguir, você encontrará uma série de afirmações. Por favor, indique o quanto você concorda ou discorda de cada uma delas.',
      developers:
        'Sprecher, S., & Metts, S. (1989). Development of the "Romantic Beliefs Scale" and examination of the ' +
        'effects of gender and gender-role orientation. Journal of Social and Personal Relationships, 6(4), ' +
        '387-411. http://doi.org/10.1177/0265407589064001',
      references:
        'Zibenberg, D., & Natividade, J. C. (2024). Alma Gêmea: Adaptação da Romantic Beliefs Scale. Psico-USF, ' +
        '29, e264839. https://doi.org/10.1590/1413-827120242901e264839',
      scales: [
        { label: 'Escala global', formula: 'A escala global será a média da pontuação de todas as subescalas.', hasCutoffs: false },
        { label: 'Amor encontra uma maneira', formula: 'Resultado calculado através da média das questões 3, 7, 9, 11, 13.', hasCutoffs: false },
        { label: 'Amor à primeira vista', formula: 'Resultado calculado através da média das questões 4, 10.', hasCutoffs: false },
        { label: 'Um e único', formula: 'Resultado calculado através da média das questões 1, 2, 8.', hasCutoffs: false },
        { label: 'Idealização', formula: 'Resultado calculado através da média das questões 5, 6, 12.', hasCutoffs: false },
      ],
    },
  },
  {
    key: 'ecr',
    label: 'Experiências em Relacionamentos Íntimos (ECR-R)',
    description: '10 perguntas sobre apego adulto (ansiedade e evitação) em relacionamentos.',
    path: '/questionario-ecr',
    documentation: {
      badge: 'Escala Padronizada',
      tags: ['Relacionamento'],
      overview:
        'A Experiences in Close Relationships – versão reduzida (ECR-R) é um instrumento de autorrelato destinado ' +
        'à avaliação dimensional do apego adulto em relacionamentos íntimos, fundamentado na teoria do apego de ' +
        'Bowlby e no modelo bidimensional proposto por Brennan, Clark e Shaver (1998). O instrumento avalia dois ' +
        'construtos centrais e relativamente relacionados: ansiedade e evitação. O objetivo clínico principal é ' +
        'identificar padrões de insegurança no apego que impactam a regulação emocional, o funcionamento ' +
        'interpessoal e os vínculos afetivos, com relevância transdiagnóstica.',
      applicationTime: '3 a 5 minutos',
      targetPopulation: 'Adultos (≥18 anos)',
      recommendedUses: [
        'Triagem clínica inicial, levantando hipóteses sobre funcionamento interpessoal sem pretensão diagnóstica',
        'Apoio à formulação de caso clínico: estratégias de regulação emocional e padrões recorrentes em relacionamentos íntimos',
        'Avaliação transdiagnóstica e do funcionamento interpessoal e conjugal',
        'Planejamento e monitoramento de processos terapêuticos',
      ],
      interpretation:
        `1. Estrutura do instrumento
Número total de itens: 10 itens. Tipo de resposta: escala Likert de 7 pontos (1 = "Discordo totalmente" a 7 = "Concordo totalmente"). Organização: 2 subescalas (Ansiedade e Evitação).

2. Descrição das subescalas, dimensões ou fatores
Ansiedade: medo de rejeição e abandono, necessidade intensa de proximidade, hipersensibilidade à responsividade do parceiro e sofrimento quando o outro está indisponível. Evitação: desconforto com intimidade emocional, relutância em depender do parceiro, valorização da autossuficiência e estratégias de distanciamento afetivo.

3. Pontuação e faixas de interpretação (cutoffs)
Cálculo por soma dos itens de cada subescala. Os estudos não apresentam pontos de corte clínicos validados, nem para a versão original nem para a brasileira.
- Ansiedade alta: apego ansioso/inseguro, associado a hipervigilância relacional, dependência emocional, maior reatividade afetiva e risco aumentado para sintomas internalizantes. Baixa: maior segurança emocional e menor medo de rejeição.
- Evitação alta: apego evitativo/inseguro, frequentemente associado a supressão emocional, dificuldades de intimidade, resistência ao vínculo terapêutico e menor busca por apoio. Baixa: maior conforto com proximidade emocional e interdependência saudável.

4. Mudança clínica e sensibilidade
O estudo não apresenta dados de RCI ou MCID. Pode ser utilizado para monitoramento longitudinal, desde que interpretado como indicador de traço relativamente estável, sensível a mudanças graduais em processos terapêuticos focados em vínculo.

5. Cuidados éticos e limitações de aplicação
Não deve ser utilizado isoladamente para diagnóstico e não substitui entrevista clínica. A interpretação deve considerar o contexto cultural, o tipo de relacionamento, o momento do ciclo de vida e comorbidades emocionais.

6. Sugestões para análise clínica
Utilizar os escores para formular hipóteses sobre estratégias de regulação emocional, compreender padrões de vinculação no setting terapêutico e antecipar rupturas de aliança terapêutica. Integração recomendada com entrevista clínica focada em vínculos e medidas de regulação emocional, esquemas interpessoais ou funcionamento da personalidade. Intervenções podem ser direcionadas conforme o perfil: alta ansiedade → foco em tolerância à separação e segurança relacional; alta evitação → foco em acesso emocional, confiança interpessoal e flexibilização defensiva.`,
      patientInstructions:
        'Por favor, leia as afirmações a seguir e marque o quanto cada uma descreve as emoções e sentimentos que ' +
        'você geralmente tem em relacionamentos amorosos e/ou sexuais. Queremos saber como você se sente em ' +
        'relacionamentos amorosos e/ou sexuais de modo geral, não apenas no seu relacionamento atual ou no seu ' +
        'último relacionamento. Mesmo que você nunca tenha tido um relacionamento, por favor, responda imaginando ' +
        'como você se sentiria se estivesse em um.',
      developers:
        'Wei, M., Russell, D. W., Mallinckrodt, B., & Vogel, D. L. (2007). The Experiences in Close Relationship ' +
        'Scale (ECR)-short form: Reliability, validity, and factor structure. Journal of Personality Assessment, ' +
        '88(2), 187-204. https://doi.org/10.1080/00223890701268041',
      references:
        'Brennan, K. A., Clark, C. L., & Shaver, P. R. (1998). Self-report measurement of adult attachment: An ' +
        'integrative overview. In J. A. Simpson & W. S. Rholes (Orgs.), Attachment theory and close relationships ' +
        '(pp. 46-76). Nova Iorque: Guilford Press. Natividade, J. C., & Shiramizu, V. K. M. (2015). Uma medida de ' +
        'apego: versão brasileira da Experiences in Close Relationship Scale-Reduzida (ECR-R-Brasil). Psicologia ' +
        'usp, 26(3), 484-494. https://doi.org/10.1590/0103-656420140086',
      scales: [
        { label: 'Ansiedade', formula: 'Resultado calculado através da soma das questões 2, 4, 6, 8, 10.', hasCutoffs: false },
        { label: 'Evitação', formula: 'Resultado calculado através da soma das questões 1, 3, 5, 7, 9.', hasCutoffs: false },
      ],
    },
  },
  {
    key: 'ensra',
    label: 'Satisfação com o Relacionamento (ENSRA-R)',
    description: '5 perguntas sobre satisfação global com o relacionamento amoroso.',
    path: '/questionario-ensra',
    documentation: {
      badge: 'Escala Padronizada',
      tags: ['Relacionamento'],
      overview:
        'A Escala do Nível de Satisfação com o Relacionamento Amoroso - Revisada (ENSRA-R) avalia a satisfação ' +
        'global com o relacionamento amoroso, compreendida como uma atitude geral do indivíduo em relação ao seu ' +
        'relacionamento, resultante da avaliação subjetiva do balanço entre aspectos positivos e negativos da ' +
        'relação. A ENSRA-R foi proposta com inclusão de itens mais "difíceis" (maior exigência de satisfação ' +
        'elevada) em relação à versão original (ENSRA), visando melhorar a cobertura do traço latente em níveis ' +
        'altos. O instrumento é fundamentado no Modelo de Investimento do Processo de Comprometimento (Rusbult, ' +
        '1980; Rusbult et al., 1998), mas é conceitual e psicometricamente independente das demais escalas do ' +
        'modelo, podendo ser utilizado de forma isolada.',
      applicationTime: '3 minutos',
      targetPopulation: 'Adultos envolvidos em relacionamento amoroso comprometido (namoro estável, noivado, casamento ou coabitação)',
      recommendedUses: [
        'Triagem clínica em psicoterapia individual ou de casal',
        'Avaliação inicial da qualidade relacional',
        'Monitoramento de processos terapêuticos focados em relacionamento',
        'Pesquisa em psicologia clínica, social e da família',
      ],
      interpretation:
        `1. Estrutura do instrumento
Número total de itens: 5 itens. Tipo de resposta: escala Likert de 9 pontos (0 = "Discordo completamente" a 8 = "Concordo completamente"). Organização: unidimensional.

2. Descrição das subescalas, dimensões ou fatores
A ENSRA-R é unidimensional, avaliando a satisfação global com o relacionamento amoroso — uma avaliação geral e subjetiva do vínculo, que integra múltiplos aspectos do relacionamento segundo os critérios pessoais do respondente, sem identificar domínios específicos de insatisfação.

3. Pontuação e faixas de interpretação (cutoffs)
Escore total: média dos itens. O estudo não apresenta pontos de corte clínicos normatizados para classificação categórica (baixo, médio, alto) — a interpretação deve ser dimensional e contextualizada, comparando mudanças intraindividuais ao longo do tempo e resultados com outros indicadores clínicos. Escores elevados indicam avaliação global positiva do relacionamento, maior probabilidade de manutenção do vínculo e associação com maiores níveis de comprometimento. Escores baixos sugerem insatisfação global, maior vulnerabilidade relacional e maior probabilidade de ideação de término ou sofrimento associado ao vínculo.

4. Mudança clínica e sensibilidade
O instrumento é adequado para reaplicações, dada sua brevidade e alta precisão, podendo ser usado para monitoramento longitudinal — especialmente para observar tendências de melhora ou deterioração da satisfação ao longo do processo terapêutico. Não são apresentados dados de RCI ou MCID no artigo.

5. Cuidados éticos e limitações de aplicação
A ENSRA-R não deve ser utilizada isoladamente para decisões diagnósticas, não substitui entrevista clínica ou avaliação do funcionamento conjugal, e não identifica causas específicas da insatisfação (ex.: comunicação, sexualidade, violência). Pode sofrer influência de desejabilidade social, embora estudos indiquem correlações baixas com esse viés no instrumento original.

6. Sugestões para análise clínica
Utilizar a ENSRA-R como indicador global de sofrimento ou bem-estar relacional, integrando os resultados com entrevista clínica focada em história do relacionamento e instrumentos complementares (ajustamento diádico, conflito conjugal, comprometimento). Em psicoterapia de casal, escores persistentemente baixos podem indicar necessidade de intervenções focadas em renegociação do vínculo ou exploração de ambivalência, expectativas frustradas ou decisões sobre continuidade da relação. Em psicoterapia individual, pode auxiliar na formulação de hipóteses sobre o impacto do relacionamento na saúde mental e dilemas de permanência vs. separação.`,
      patientInstructions:
        'A seguir, você encontrará uma série de afirmações sobre relacionamentos amorosos. Por favor, leia cada ' +
        'uma delas e responda de acordo com a sua opinião. Pensando no(a) seu(sua) parceiro(a), indique, ' +
        'utilizando a escala, o quanto você concorda com cada uma das afirmações.',
      developers:
        'Rusbult, C. E., Martz, J. M., & Agnew, C. R. (1998). The investment model scale: Measuring commitment ' +
        'level, satisfaction level, quality of alternatives, and investment size. Personal Relationships, 5(4), ' +
        '357-387. https://doi.org/10.1111/j.1475-6811.1998.tb00177.x',
      references:
        'Londero-Santos, A., Natividade, J. C., & Féres-Carneiro, T. (2021). Uma medida de satisfação com o ' +
        'relacionamento amoroso. Avaliação Psicológica: Interamerican Journal of Psychological Assessment, 20(1), ' +
        '11-22. http://doi.org/10.15689/ap.2021.2001.18901.02',
      scales: [
        { label: 'Escala global', formula: 'A escala global será a média da pontuação de todas as questões.', hasCutoffs: false },
      ],
    },
  },
  {
    key: 'etas',
    label: 'Escala Triangular do Amor de Sternberg (ETAS-R)',
    description: '16 perguntas sobre intimidade, paixão e compromisso no relacionamento.',
    path: '/questionario-etas',
    documentation: {
      badge: 'Escala Padronizada',
      tags: ['Relacionamento'],
      overview:
        'A Escala Triangular do Amor de Sternberg – Versão Reduzida (ETAS-R) avalia o amor romântico a partir do ' +
        'modelo teórico triangular proposto por Sternberg, compreendendo o amor como a articulação de três ' +
        'componentes centrais e inter-relacionados: intimidade, paixão e decisão/compromisso. O instrumento ' +
        'investiga, por meio de autorrelato, o grau em que o indivíduo percebe proximidade emocional, apoio e ' +
        'vínculo afetivo com o parceiro (intimidade), atração física e excitação associadas ao relacionamento ' +
        '(paixão), bem como a decisão cognitiva de amar e o comprometimento em manter o vínculo ao longo do tempo ' +
        '(decisão/compromisso), permitindo uma avaliação dimensional e integrada da qualidade e da dinâmica do ' +
        'relacionamento amoroso.',
      applicationTime: '8 minutos',
      targetPopulation: 'Adultos (≥18 anos) com experiência prévia de relacionamento romântico',
      recommendedUses: [
        'Avaliação de relacionamentos amorosos',
        'Formulação de caso em psicoterapia individual ou de casal',
        'Monitoramento de processos terapêuticos focados em vínculos afetivos',
      ],
      interpretation:
        `1. Estrutura do instrumento
Número total de itens: 16 itens. Tipo de resposta: escala Likert de 5 pontos (Discordo fortemente a Concordo fortemente). Organização: 3 subescalas (Intimidade, Paixão e Compromisso).

2. Descrição das subescalas, dimensões ou fatores
Intimidade: sentimentos de proximidade emocional, vínculo, apoio e compreensão mútua. Paixão: atração física, excitação sexual e ativação motivacional. Compromisso: decisão cognitiva de amar e manutenção do vínculo ao longo do tempo.

3. Pontuação e faixas de interpretação (cutoffs)
Pontuação pela soma dos itens de cada fator. O estudo não apresenta pontos de corte clínicos nem normas interpretativas categóricas — recomenda-se interpretação relativa, comparando as subescalas entre si e ao longo do tempo (monitoramento intraindivíduo).
- Intimidade alta: vínculo emocional sólido, comunicação aberta e percepção de suporte mútuo. Baixa: distanciamento emocional, dificuldades de conexão afetiva ou empobrecimento do vínculo.
- Paixão alta: ativação erótica e envolvimento motivacional intenso. Baixa: diminuição da excitação sexual ou transformação do vínculo para formas mais companheiras.
- Compromisso alto: investimento relacional, compromisso e perspectiva de continuidade. Baixo: ambivalência, instabilidade ou incerteza quanto ao futuro da relação.

4. Mudança clínica e sensibilidade
O estudo não apresenta dados de sensibilidade à mudança, RCI ou MCID. Apesar disso, pela alta consistência interna e estabilidade estrutural, o instrumento pode ser reaplicado para fins exploratórios de acompanhamento terapêutico, com cautela interpretativa.

5. Cuidados éticos e limitações de aplicação
Não deve ser utilizado isoladamente para decisões clínicas — deve ser integrado a entrevista clínica, observação do contexto relacional e outros instrumentos (ex.: satisfação conjugal, apego, comunicação). Resultados podem ser influenciados por idealização do relacionamento, especialmente em fases iniciais.

6. Sugestões para análise clínica
Perfis discrepantes entre subescalas (ex.: alta paixão e baixo compromisso) podem orientar hipóteses sobre instabilidade, conflito ou fase do relacionamento. Reduções específicas em uma dimensão podem direcionar intervenções focadas (ex.: comunicação emocional para intimidade; renegociação de expectativas para compromisso). Pode ser combinada com medidas de satisfação conjugal, estilos de apego e habilidades sociais para uma formulação de caso relacional mais abrangente.`,
      patientInstructions:
        'Vamos apresentar para você algumas frases sobre o seu relacionamento amoroso. Avalie o quanto você ' +
        'concorda com cada ideia apresentada. Selecione a opção que melhor representa sua opinião.',
      developers:
        'Sternberg, R. J. (1997). Construct validation of a triangular love scale. European Journal of Social ' +
        'Psychology, 27, 313-335. https://doi.org/10.1002/(SICI)1099-0992(199705)27:3<313::AID-EJSP824>3.0.CO;2-4',
      references:
        'Andrade, A. L. D., Garcia, A., & Cassepp-Borges, V. (2013). Evidências de validade da escala triangular ' +
        'do amor de Sternberg-reduzida (ETAS-R). Psico-USF, 18, 501-510. https://doi.org/10.1590/S1413-82712013000300016',
      scales: [
        { label: 'Intimidade', formula: 'Resultado calculado através da soma das questões 7, 8, 9, 10, 11.', hasCutoffs: false },
        { label: 'Paixão', formula: 'Resultado calculado através da soma das questões 12, 13, 14, 15, 16.', hasCutoffs: false },
        { label: 'Compromisso', formula: 'Resultado calculado através da soma das questões 1, 2, 3, 4, 5, 6.', hasCutoffs: false },
      ],
    },
  },
];

export function getInstrument(key: string): InstrumentConfig | undefined {
  return INSTRUMENTS.find((i) => i.key === key);
}
