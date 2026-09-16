// Ordem clínica fixa dos 14 modos do SMI — a mesma usada no instrumento
// original (blocos de Criança, depois Enfrentamento Disfuncional,
// Hipercompensadores, Pais Internalizados e por fim Adulto Saudável).
// Não existe coluna de ordenação no banco pra isso; como os 14 códigos são
// fixos, é mais simples manter essa lista compartilhada entre o formulário
// público e as telas do terapeuta do que adicionar uma coluna só pra isso.

export const SMI_MODE_ORDER = [
  'crianca_vulneravel',
  'crianca_zangada',
  'crianca_raivosa',
  'crianca_impulsiva',
  'crianca_indisciplinada',
  'crianca_feliz',
  'capitulador_complacente',
  'protetor_desligado',
  'autoconfortador_desligado',
  'autoengrandecedor',
  'intimidacao_ataque',
  'pais_punitivos',
  'pais_exigentes_criticos',
  'adulto_saudavel',
];

export const SMI_CATEGORY_ORDER = [
  'crianca',
  'enfrentamento_disfuncional',
  'hipercompensador',
  'pais_internalizados',
  'adulto_saudavel',
];

export const SMI_CATEGORY_LABELS: Record<string, string> = {
  crianca: 'Modos Criança',
  enfrentamento_disfuncional: 'Modos de Enfrentamento Disfuncionais',
  hipercompensador: 'Modos Hipercompensadores',
  pais_internalizados: 'Modos Pais Internalizados',
  adulto_saudavel: 'Modo Adulto Saudável',
};

export function sortByModeOrder<T extends { code: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => SMI_MODE_ORDER.indexOf(a.code) - SMI_MODE_ORDER.indexOf(b.code));
}

// Combinações de modos com leitura clínica documentada no instrumento (não
// são pontos de corte — o SMI não tem cutoffs validados pra população BR).
// Mostramos o insight quando os dois modos do par estão entre os mais
// ativados do cliente (ver TOP_MODES_FOR_RELATIONSHIPS em SMIResponseDetail).
export const SMI_MODE_RELATIONSHIPS: { codes: [string, string]; insight: string }[] = [
  {
    codes: ['crianca_vulneravel', 'protetor_desligado'],
    insight: 'Criança Vulnerável + Protetor Desligado → hiporregulação emocional e evitação.',
  },
  {
    codes: ['crianca_impulsiva', 'crianca_raivosa'],
    insight: 'Criança Impulsiva + Criança Raivosa → impulsividade e externalização agressiva.',
  },
  {
    codes: ['pais_punitivos', 'crianca_vulneravel'],
    insight: 'Pais Punitivos + Criança Vulnerável → ciclos de autocrítica e retraimento.',
  },
];

export const SMI_ETHICAL_NOTICE =
  'Este instrumento não deve ser usado isoladamente para diagnóstico — requer entrevista clínica e avaliação complementar de esquemas e coping. Sem pontos de corte validados para a população brasileira; interprete os escores como frequência relativa de ativação de cada modo, não como classificação fechada.';
