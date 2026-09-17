// Compatibility facade for application-facing types.
//
// The Database/Json/Table helpers below come from the production schema
// snapshot in database.generated.types.ts. The named interfaces are kept
// temporarily because older UI code and mocks import them directly; removing
// those compatibility types is a separate refactor and is not required to
// make the Supabase client aware of the real schema.

export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from './database.generated.types';
export { Constants } from './database.generated.types';

export type Role = 'therapist' | 'client';
export type QuestionType = 'text' | 'number' | 'scale' | 'emotion';

export interface EmotionOption {
  emoji: string;
  label: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  whatsapp?: string | null;
  address?: string | null;
  diary_id?: string | null;
  created_at: string;
  first_login_at?: string | null;
  last_login_at?: string | null;
}

export interface Diary {
  id: string;
  name: string;
  is_active: boolean;
  available_from: string | null;
  available_to: string | null;
  created_at: string;
}

export interface DiaryQuestion {
  id: string;
  diary_id: string;
  order_num: number;
  text: string;
  type: QuestionType;
  options: EmotionOption[] | null;
  required: boolean;
  created_at: string;
}

export interface DayNote {
  id: string;
  user_id: string;
  noted_at: string;
  content: string | null;
  emotions: { label: string; intensity: number }[];
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  diary_id: string;
  date: string;
  created_at: string;
  goal_id?: string | null;
}

export interface EntryAnswer {
  id: string;
  entry_id: string;
  question_id: string;
  answer_text: string | null;
  answer_value: number | null;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  content_text: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Roteiro {
  id: string;
  user_id: string;
  title: string;
  cena: string;
  crenca: string;
  mecanismo: string;
  termo: string;
  teste: string;
  fechamento: string;
  checklist: boolean[];
  source_text: string | null;
  extracted_at: string | null;
  ai_review?: unknown | null;
  ai_rewrite?: unknown | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Joined compatibility types used by existing screens.
export interface DiaryEntryWithAnswers extends DiaryEntry {
  answers: (EntryAnswer & { question: DiaryQuestion })[];
  diary: Diary;
}

export interface ReportWithProfile extends Report {
  profile?: Profile;
}
