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
];

export function getInstrument(key: string): InstrumentConfig | undefined {
  return INSTRUMENTS.find((i) => i.key === key);
}
