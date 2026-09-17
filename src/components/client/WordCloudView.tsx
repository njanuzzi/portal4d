import type { WordFrequency } from '../../lib/textAnalysis';

// Cores e leve rotação alternam por posição (não por frequência) pra dar a
// sensação de nuvem em vez de lista ordenada — sem física de layout, só
// flex-wrap com tamanho de fonte proporcional à frequência.
const COLORS = ['text-petrol-700', 'text-gold-600', 'text-petrol-500', 'text-gold-700', 'text-petrol-400'];
const ROTATIONS = [-4, 0, 3, 0, -2, 4, 0];

const MIN_SIZE = 13;
const MAX_SIZE = 34;

interface WordCloudViewProps {
  words: WordFrequency[];
}

export function WordCloudView({ words }: WordCloudViewProps) {
  if (words.length === 0) {
    return (
      <p className="text-xs text-dark/40 text-center py-8">
        Preencha respostas de texto livre no diário para ver sua nuvem de palavras aqui.
      </p>
    );
  }

  const maxValue = words[0].value;
  const minValue = words[words.length - 1].value;
  const range = maxValue - minValue || 1;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-4">
      {words.map((word, i) => {
        const fontSize = MIN_SIZE + ((word.value - minValue) / range) * (MAX_SIZE - MIN_SIZE);
        return (
          <span
            key={word.text}
            className={`font-serif leading-none ${COLORS[i % COLORS.length]}`}
            style={{ fontSize: `${fontSize}px`, transform: `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)` }}
            title={`${word.value} ocorrência${word.value !== 1 ? 's' : ''}`}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
}
