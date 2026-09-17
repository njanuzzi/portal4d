export interface BFIFactor {
  key: string;
  label: string;
  questionNumbers: number[];
}

// Mesmo mapeamento usado em supabase/functions/bfi-assessment-save — mantenha
// os dois em sincronia se este instrumento for revisado. Sem pontos de corte
// validados pra população brasileira (conforme o próprio instrumento), então
// o resultado é só a média por fator, sem classificação.
export const BFI_FACTORS: BFIFactor[] = [
  { key: 'extroversao', label: 'Extroversão', questionNumbers: [1, 7, 10, 17] },
  { key: 'amabilidade', label: 'Amabilidade', questionNumbers: [3, 11, 19, 23] },
  { key: 'conscienciosidade', label: 'Conscienciosidade', questionNumbers: [4, 12, 14, 18, 24] },
  { key: 'neuroticismo', label: 'Neuroticismo', questionNumbers: [5, 8, 13, 15, 20, 21] },
  { key: 'abertura', label: 'Abertura à Experiência', questionNumbers: [2, 6, 9, 16, 22, 25] },
];

export interface BFIFactorScore extends BFIFactor {
  average: number;
}

export function computeBfiFactorScores(answers: Record<string, number>): BFIFactorScore[] {
  return BFI_FACTORS.map((factor) => {
    const sum = factor.questionNumbers.reduce((total, qn) => total + (answers[String(qn)] ?? 0), 0);
    const average = sum / factor.questionNumbers.length;
    return { ...factor, average };
  });
}
