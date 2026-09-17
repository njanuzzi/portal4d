export interface ETASSubscale {
  key: string;
  label: string;
  questionNumbers: number[];
}

// Mesmo mapeamento usado em supabase/functions/etas-assessment-save — mantenha
// os dois em sincronia se este instrumento for revisado. Sem escala global —
// o instrumento só reporta as três subescalas separadamente (somas).
export const ETAS_SUBSCALES: ETASSubscale[] = [
  { key: 'compromisso', label: 'Compromisso', questionNumbers: [1, 2, 3, 4, 5, 6] },
  { key: 'intimidade', label: 'Intimidade', questionNumbers: [7, 8, 9, 10, 11] },
  { key: 'paixao', label: 'Paixão', questionNumbers: [12, 13, 14, 15, 16] },
];

export interface ETASSubscaleScore extends ETASSubscale {
  sum: number;
}

export function computeEtasScores(answers: Record<string, number>): ETASSubscaleScore[] {
  return ETAS_SUBSCALES.map((s) => {
    const sum = s.questionNumbers.reduce((total, qn) => total + (answers[String(qn)] ?? 0), 0);
    return { ...s, sum };
  });
}
