import type { Profile, Diary, DiaryQuestion, DiaryEntry, EntryAnswer, Report } from './database.types';

export const MOCK_THERAPIST: Profile = {
  id: 'dev-therapist',
  email: 'nubia@portald4.com',
  name: 'Núbia Admin',
  role: 'therapist',
  active: true,
  created_at: '2026-01-01T00:00:00Z',
};

export const MOCK_CLIENTS: Profile[] = [
  {
    id: 'dev-client-1',
    email: 'ana@exemplo.com',
    name: 'Ana Clara Souza',
    role: 'client',
    active: true,
    created_at: '2026-02-10T00:00:00Z',
  },
  {
    id: 'dev-client-2',
    email: 'pedro@exemplo.com',
    name: 'Pedro Alves Lima',
    role: 'client',
    active: true,
    created_at: '2026-03-05T00:00:00Z',
  },
  {
    id: 'dev-client-3',
    email: 'mariana@exemplo.com',
    name: 'Mariana Costa',
    role: 'client',
    active: false,
    created_at: '2026-01-20T00:00:00Z',
  },
];

export const MOCK_DIARIES: Diary[] = [
  {
    id: 'dev-diary-1',
    name: 'Diário Emocional — 4D',
    is_active: true,
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'dev-diary-2',
    name: 'Diário de Pensamentos Automáticos',
    is_active: false,
    created_at: '2026-01-15T00:00:00Z',
  },
];

export const MOCK_QUESTIONS: DiaryQuestion[] = [
  { id: 'dev-q-1', diary_id: 'dev-diary-1', order: 1, text: 'Como você está se sentindo hoje (0-10)?', type: 'scale', created_at: '2026-02-01T00:00:00Z' },
  { id: 'dev-q-2', diary_id: 'dev-diary-1', order: 2, text: 'Descreva seu humor em uma palavra.', type: 'text', created_at: '2026-02-01T00:00:00Z' },
  { id: 'dev-q-3', diary_id: 'dev-diary-1', order: 3, text: 'Houve algum pensamento recorrente hoje?', type: 'text', created_at: '2026-02-01T00:00:00Z' },
  { id: 'dev-q-4', diary_id: 'dev-diary-1', order: 4, text: 'Nível de ansiedade (0-10)?', type: 'scale', created_at: '2026-02-01T00:00:00Z' },
];

export const MOCK_ENTRIES: DiaryEntry[] = [
  { id: 'dev-entry-1', user_id: 'dev-client-1', diary_id: 'dev-diary-1', date: '2026-05-01', created_at: '2026-05-01T09:00:00Z' },
  { id: 'dev-entry-2', user_id: 'dev-client-1', diary_id: 'dev-diary-1', date: '2026-05-02', created_at: '2026-05-02T10:00:00Z' },
  { id: 'dev-entry-3', user_id: 'dev-client-2', diary_id: 'dev-diary-1', date: '2026-05-01', created_at: '2026-05-01T11:00:00Z' },
  { id: 'dev-entry-4', user_id: 'dev-client-2', diary_id: 'dev-diary-1', date: '2026-05-03', created_at: '2026-05-03T08:30:00Z' },
];

export const MOCK_ANSWERS: EntryAnswer[] = [
  { id: 'dev-a-1', entry_id: 'dev-entry-1', question_id: 'dev-q-1', answer_text: null, answer_value: 7, created_at: '2026-05-01T09:00:00Z' },
  { id: 'dev-a-2', entry_id: 'dev-entry-1', question_id: 'dev-q-2', answer_text: 'Calma', answer_value: null, created_at: '2026-05-01T09:00:00Z' },
  { id: 'dev-a-3', entry_id: 'dev-entry-1', question_id: 'dev-q-3', answer_text: 'Pensamentos sobre o futuro', answer_value: null, created_at: '2026-05-01T09:00:00Z' },
  { id: 'dev-a-4', entry_id: 'dev-entry-1', question_id: 'dev-q-4', answer_text: null, answer_value: 4, created_at: '2026-05-01T09:00:00Z' },
  { id: 'dev-a-5', entry_id: 'dev-entry-2', question_id: 'dev-q-1', answer_text: null, answer_value: 8, created_at: '2026-05-02T10:00:00Z' },
  { id: 'dev-a-6', entry_id: 'dev-entry-2', question_id: 'dev-q-2', answer_text: 'Animada', answer_value: null, created_at: '2026-05-02T10:00:00Z' },
  { id: 'dev-a-7', entry_id: 'dev-entry-2', question_id: 'dev-q-3', answer_text: 'Nenhum pensamento negativo', answer_value: null, created_at: '2026-05-02T10:00:00Z' },
  { id: 'dev-a-8', entry_id: 'dev-entry-2', question_id: 'dev-q-4', answer_text: null, answer_value: 2, created_at: '2026-05-02T10:00:00Z' },
  { id: 'dev-a-9', entry_id: 'dev-entry-3', question_id: 'dev-q-1', answer_text: null, answer_value: 5, created_at: '2026-05-01T11:00:00Z' },
  { id: 'dev-a-10', entry_id: 'dev-entry-3', question_id: 'dev-q-2', answer_text: 'Tenso', answer_value: null, created_at: '2026-05-01T11:00:00Z' },
];

export const MOCK_REPORTS: (Report & { profile: Profile | null })[] = [
  {
    id: 'dev-report-1',
    user_id: 'dev-client-1',
    period_start: '2026-04-01',
    period_end: '2026-04-30',
    content_text: 'Ana apresentou evolução significativa no mês de abril. Humor estável com média de 7/10. Reduziu episódios de ansiedade nas últimas duas semanas. Recomendada continuidade do protocolo.',
    published: true,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    profile: MOCK_CLIENTS[0],
  },
  {
    id: 'dev-report-2',
    user_id: 'dev-client-2',
    period_start: '2026-04-01',
    period_end: '2026-04-30',
    content_text: 'Pedro demonstrou oscilações de humor ao longo do mês. Pontuação média de 5/10. Identificados gatilhos relacionados ao ambiente de trabalho. Iniciada abordagem cognitiva específica.',
    published: false,
    created_at: '2026-05-02T00:00:00Z',
    updated_at: '2026-05-02T00:00:00Z',
    profile: MOCK_CLIENTS[1],
  },
];
