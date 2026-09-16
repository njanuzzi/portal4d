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
