// CSV das respostas brutas (pergunta a pergunta) do Inventário de Esquemas —
// compartilhado entre o download de um cliente só e o download de todos.

export interface RawAnswersCsvRow {
  name: string;
  email: string;
  whatsapp: string | null;
  answers: Record<string, number>;
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export interface QuestionRef {
  question_number: number;
  question_text: string;
}

export function buildRawAnswersCsv(rows: RawAnswersCsvRow[], questions: QuestionRef[]): string {
  const header = ['Nome', 'Email', 'WhatsApp', ...questions.map((q) => q.question_text)];
  const dataRows = rows.map((r) => [
    r.name, r.email, r.whatsapp ?? '',
    ...questions.map((q) => r.answers[String(q.question_number)] ?? ''),
  ]);
  return [header, ...dataRows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Nomes oficiais dos domínios (não o friendly_name usado nos gráficos do
// cliente) — capitaliza cada palavra pra exibição na tela da terapeuta.
export function titleCase(text: string): string {
  return text.replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
