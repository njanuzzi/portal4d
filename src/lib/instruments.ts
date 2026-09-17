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
  },
  {
    key: 'smi',
    label: 'Inventário de Modos Esquemáticos (SMI)',
    description: '124 perguntas sobre frequência de modos emocionais.',
    path: '/questionario-modos',
  },
  {
    key: 'bfi',
    label: 'Big Five Inventory (BFI)',
    description: '25 perguntas sobre os cinco grandes fatores de personalidade.',
    path: '/questionario-bigfive',
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
];

export function getInstrument(key: string): InstrumentConfig | undefined {
  return INSTRUMENTS.find((i) => i.key === key);
}
