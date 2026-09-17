// ENSRA-R é unidimensional — escala global é a média direta dos 5 itens
// (cada item na escala 0-8). Mesmo cálculo usado em
// supabase/functions/ensra-assessment-save; mantenha os dois em sincronia
// se este instrumento for revisado.
export function computeEnsraScore(answers: Record<string, number>): number {
  const values = Object.values(answers);
  if (!values.length) return 0;
  const sum = values.reduce((total, v) => total + (Number(v) || 0), 0);
  return sum / values.length;
}
