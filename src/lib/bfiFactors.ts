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

// Itens redigidos no sentido oposto ao fator (ex.: "Tende a ser
// desorganizado(a)" em Conscienciosidade, "É tranquilo(a)" em Neuroticismo,
// "Tem poucos interesses artísticos" em Abertura) — entram na média
// invertidos (6 - resposta), como no instrumento original.
export const BFI_REVERSED_QUESTIONS = new Set([4, 12, 14, 24, 5, 15, 20, 22]);

export interface BFIFactorScore extends BFIFactor {
  average: number;
}

export function computeBfiFactorScores(answers: Record<string, number>): BFIFactorScore[] {
  return BFI_FACTORS.map((factor) => {
    const sum = factor.questionNumbers.reduce((total, qn) => {
      const answer = answers[String(qn)] ?? 0;
      return total + (answer && BFI_REVERSED_QUESTIONS.has(qn) ? 6 - answer : answer);
    }, 0);
    const average = sum / factor.questionNumbers.length;
    return { ...factor, average };
  });
}
