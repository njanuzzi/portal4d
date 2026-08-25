// Rótulos legíveis para as chaves de `leads.answers` preenchidas em /inscricao.
// Compartilhado entre o painel de Leads (src/pages/therapist/Leads.tsx) e o
// e-mail interno de notificação (api/inscricao-email.ts).
export const ANSWER_LABELS: Record<string, string> = {
  idade: 'Idade',
  sexo: 'Sexo',
  estado_civil: 'Estado civil',
  profissao: 'Profissão',
  como_conheceu: 'Como conheceu a Núbia',
  ja_fez_terapia: 'Já fez terapia antes',
  o_que_fez_parar: 'O que fez parar / o que faltou',
  motivo: 'O que trouxe até aqui',
  travamento_areas: 'Onde o travamento aparece mais forte',
  travamento_detalhe: 'Mais detalhes sobre o travamento',
  autoavaliacao: 'Por que acha que o Protocolo 4D é pra ela(e)',
  triagem_clinica: 'Em acompanhamento clínico/psiquiátrico no momento',
};

export function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
