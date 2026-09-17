export interface ECRSubscale {
  key: string;
  label: string;
  questionNumbers: number[];
}

// Mesmo mapeamento usado em supabase/functions/ecr-assessment-save — mantenha
// os dois em sincronia se este instrumento for revisado. Sem escala global —
// o instrumento só reporta as duas subescalas separadamente (somas).
export const ECR_SUBSCALES: ECRSubscale[] = [
  { key: 'ansiedade', label: 'Ansiedade', questionNumbers: [2, 4, 6, 8, 10] },
  { key: 'evitacao', label: 'Evitação', questionNumbers: [1, 3, 5, 7, 9] },
];

export interface ECRSubscaleScore extends ECRSubscale {
  sum: number;
}

export function computeEcrScores(answers: Record<string, number>): ECRSubscaleScore[] {
  return ECR_SUBSCALES.map((s) => {
    const sum = s.questionNumbers.reduce((total, qn) => total + (answers[String(qn)] ?? 0), 0);
    return { ...s, sum };
  });
}
