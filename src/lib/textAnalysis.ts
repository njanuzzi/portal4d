// Stopwords em pt-BR — cobre artigos, preposições, pronomes, conjunções e
// flexões comuns de "ser"/"estar"/"ter", que dominam qualquer texto livre em
// português e não carregam sinal nenhum numa nuvem de palavras.
const STOPWORDS = new Set([
  'a', 'ao', 'aos', 'aquela', 'aquelas', 'aquele', 'aqueles', 'aquilo', 'as', 'até',
  'com', 'como', 'da', 'das', 'de', 'dela', 'delas', 'dele', 'deles', 'depois', 'do', 'dos',
  'e', 'ela', 'elas', 'ele', 'eles', 'em', 'entre', 'era', 'eram', 'essa', 'essas', 'esse',
  'esses', 'esta', 'estamos', 'estão', 'estar', 'estas', 'estava', 'estavam', 'este', 'esteja',
  'estejam', 'estes', 'esteve', 'estive', 'estivemos', 'estiveram', 'estou', 'eu', 'foi', 'fomos',
  'for', 'foram', 'fosse', 'fossem', 'fui', 'há', 'isso', 'isto', 'já', 'lhe', 'lhes', 'mais',
  'mas', 'me', 'mesmo', 'meu', 'meus', 'minha', 'minhas', 'muito', 'na', 'não', 'nas', 'nem',
  'no', 'nos', 'nós', 'nossa', 'nossas', 'nosso', 'nossos', 'num', 'numa', 'o', 'os', 'ou',
  'para', 'pela', 'pelas', 'pelo', 'pelos', 'per', 'pois', 'por', 'porque', 'qual', 'quando',
  'que', 'quem', 'se', 'sem', 'ser', 'seu', 'seus', 'só', 'somos', 'sou', 'sua', 'suas', 'são',
  'também', 'te', 'tem', 'têm', 'temos', 'tenho', 'ter', 'teu', 'teus', 'ti', 'tive', 'tivemos',
  'tiveram', 'tu', 'tua', 'tuas', 'um', 'uma', 'umas', 'uns', 'você', 'vocês', 'vou', 'yo',
]);

export interface WordFrequency {
  text: string;
  value: number;
}

// Extrai as palavras mais frequentes de um conjunto de respostas livres,
// descartando stopwords e palavras curtas (menos de 3 letras) que costumam
// ser ruído. `limit` controla quantas palavras entram na nuvem.
export function getWordFrequencies(texts: string[], limit = 40): WordFrequency[] {
  const counts = new Map<string, number>();

  for (const text of texts) {
    if (!text) continue;
    const words = text
      .toLowerCase()
      .normalize('NFC')
      .split(/[^\p{L}]+/u)
      .filter(Boolean);

    for (const word of words) {
      if (word.length < 3 || STOPWORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
