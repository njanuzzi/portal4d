// Escala de Amor do MARQ é unidimensional — as 9 perguntas inteiras entram
// nos dois escores, só muda a forma de agregar. Mesmo cálculo usado em
// supabase/functions/marq-assessment-save; mantenha os dois em sincronia se
// este instrumento for revisado.
export interface MarqScores {
  /** Escala global — soma das 9 questões (9 a 45). */
  global: number;
  /** Escore total — média das 9 questões (1.00 a 5.00). */
  escoreTotal: number;
}

export function computeMarqScores(answers: Record<string, number>): MarqScores {
  const values = Object.values(answers);
  const global = values.reduce((total, v) => total + (Number(v) || 0), 0);
  const escoreTotal = values.length ? global / values.length : 0;
  return { global, escoreTotal };
}
