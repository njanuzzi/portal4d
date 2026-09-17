// Compatibility facade for application-facing types.
//
// IMPORTANT: `Database` below still comes from database.generated.types.ts and
// remains the source of truth for Supabase queries/RPCs. The named interfaces
// in this file are legacy UI models kept temporarily so older screens can be
// migrated incrementally without changing runtime behavior in one large PR.

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
  // Transitional compatibility: production allows null, while several legacy
  // screens still treat these fields as present. Normalize per screen later.
  name: any;
  role: any;
  active: any;
  whatsapp?: string | null;
  address?: string | null;
  diary_id?: string | null;
  created_at: any;
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
  is_active: any;
  available_from?: string | null;
  available_to?: string | null;
  created_at: any;
}

export interface DiaryQuestion {
  id: string;
  diary_id: string;
  order_num: number;
  // Temporary alias used only by old mock data.
  order?: number;
  text: string;
  type: any;
  options?: any;
  required?: boolean;
  created_at?: any;
}

export interface DayNote {
  id: string;
  user_id: string;
  noted_at: string;
  content: string | null;
  emotions: any;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  diary_id: string;
  date: string;
  created_at: any;
  goal_id?: string | null;
}

export interface EntryAnswer {
  id: string;
  entry_id: string;
  question_id: string;
  answer_text: string | null;
  answer_value: number | null;
  created_at?: any;
}

export interface Report {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  content_text: any;
  published: any;
  created_at: any;
  updated_at?: any;
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
