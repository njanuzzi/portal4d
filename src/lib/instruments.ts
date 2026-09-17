// Lista de instrumentos que podem ser respondidos via link individual por
// cliente (ver InstrumentInvite.tsx). Pra adicionar um novo instrumento no
// futuro (BigFive, Relacionamento etc.): criar a página pública em
// src/pages/, aceitar "?token=" nela igual SchemaQuestionnaire/SMIQuestionnaire,
// aceitar "invite_token" na edge function de start, e adicionar uma entrada
// aqui — nada mais precisa mudar na tela de Instrumentos.
export interface InstrumentConfig {
  key: string;
  label: string;
  description: string;
  path: string;
}

export const INSTRUMENTS: InstrumentConfig[] = [
  {
    key: 'esquemas',
    label: 'Formulário de Esquemas (YSQ)',
    description: 'Mapeamento de Padrões — 205 perguntas sobre esquemas emocionais.',
    path: '/questionario-esquemas',
  },
  {
    key: 'smi',
    label: 'Inventário de Modos Esquemáticos (SMI)',
    description: '124 perguntas sobre frequência de modos emocionais.',
    path: '/questionario-modos',
  },
];

export function getInstrument(key: string): InstrumentConfig | undefined {
  return INSTRUMENTS.find((i) => i.key === key);
}
