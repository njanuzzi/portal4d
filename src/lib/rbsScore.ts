export interface RBSSubscale {
  key: string;
  label: string;
  questionNumbers: number[];
}

// Mesmo mapeamento usado em supabase/functions/rbs-assessment-save — mantenha
// os dois em sincronia se este instrumento for revisado. Escala global é a
// MÉDIA DAS MÉDIAS das 4 subescalas (não a média direta dos 13 itens).
export const RBS_SUBSCALES: RBSSubscale[] = [
  { key: 'amor_encontra_uma_maneira', label: 'Amor encontra uma maneira', questionNumbers: [3, 7, 9, 11, 13] },
  { key: 'amor_a_primeira_vista', label: 'Amor à primeira vista', questionNumbers: [4, 10] },
  { key: 'um_e_unico', label: 'Um e único', questionNumbers: [1, 2, 8] },
  { key: 'idealizacao', label: 'Idealização', questionNumbers: [5, 6, 12] },
];

export interface RBSSubscaleScore extends RBSSubscale {
  average: number;
}

export function computeRbsScores(answers: Record<string, number>): { subscales: RBSSubscaleScore[]; global: number } {
  const subscales = RBS_SUBSCALES.map((s) => {
    const sum = s.questionNumbers.reduce((total, qn) => total + (answers[String(qn)] ?? 0), 0);
    return { ...s, average: sum / s.questionNumbers.length };
  });
  const global = subscales.reduce((total, s) => total + s.average, 0) / subscales.length;
  return { subscales, global };
}
