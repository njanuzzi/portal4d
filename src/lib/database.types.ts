// Compatibility facade for application-facing types.
//
// The Database/Json/Table helpers below come from the production schema
// snapshot in database.generated.types.ts. The named interfaces are kept
// temporarily because older UI code and mocks import them directly; removing
// those compatibility types is a separate refactor and is not required to
// make the Supabase client aware of the real schema.

import type { Json as GeneratedJson } from './database.generated.types';

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
  [key: string]: GeneratedJson | undefined;
}

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean | null;
  whatsapp?: string | null;
  address?: string | null;
  diary_id?: string | null;
  created_at: string | null;
  first_login_at?: string | null;
  last_login_at?: string | null;
  diary_reminder_next_at?: string | null;
  diary_reminder_preference?: string | null;
  manychat_subscriber_id?: string | null;
  whatsapp_appointment_reminder_optin?: boolean | null;
  whatsapp_diary_reminder_optin?: boolean | null;
  whatsapp_general_info_optin?: boolean | null;
}

export interface Diary {
  id: string;
  name: string;
  is_active: boolean | null;
  available_from: string | null;
  available_to: string | null;
  created_at: string | null;
}

export interface DiaryQuestion {
  id: string;
  diary_id: string;
  order_num: number;
  text: string;
  type: string;
  options: GeneratedJson | EmotionOption[] | null;
  required: boolean;
  created_at?: string | null;
}

export interface DayNote {
  id: string;
  user_id: string;
  noted_at: string;
  content: string | null;
  emotions: GeneratedJson | { label: string; intensity: number }[] | null;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  diary_id: string;
  date: string;
  created_at: string | null;
  goal_id?: string | null;
}

export interface EntryAnswer {
  id: string;
  entry_id: string;
  question_id: string;
  answer_text: string | null;
  answer_value: number | null;
  created_at?: string | null;
}

export interface Report {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  content_text: string | null;
  published: boolean | null;
  created_at: string | null;
  updated_at?: string;
  active?: boolean | null;
  first_viewed_at?: string | null;
  last_viewed_at?: string | null;
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
