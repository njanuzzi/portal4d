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

export interface ChecklistReviewItem {
  ok: boolean;
  comment: string;
}

export interface RoteiroRewrite {
  cena: string;
  crenca: string;
  mecanismo: string;
  termo: string;
  teste: string;
  fechamento: string;
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
  ai_review: ChecklistReviewItem[] | null;
  ai_rewrite: RoteiroRewrite | null;
  extracted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Joined types
export interface DiaryEntryWithAnswers extends DiaryEntry {
  answers: (EntryAnswer & { question: DiaryQuestion })[];
  diary: Diary;
}

export interface ReportWithProfile extends Report {
  profile?: Profile;
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12"
  }
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      diaries: {
        Row: Diary;
        Insert: Omit<Diary, 'id' | 'created_at'>;
        Update: Partial<Omit<Diary, 'id' | 'created_at'>>;
      };
      diary_questions: {
        Row: DiaryQuestion;
        Insert: Omit<DiaryQuestion, 'id' | 'created_at'>;
        Update: Partial<Omit<DiaryQuestion, 'id' | 'created_at'>>;
      };
      diary_entries: {
        Row: DiaryEntry;
        Insert: Omit<DiaryEntry, 'id' | 'created_at'>;
        Update: Partial<Omit<DiaryEntry, 'id' | 'created_at'>>;
      };
      entry_answers: {
        Row: EntryAnswer;
        Insert: Omit<EntryAnswer, 'id' | 'created_at'>;
        Update: Partial<Omit<EntryAnswer, 'id' | 'created_at'>>;
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Report, 'id' | 'created_at'>>;
      };
      push_subscriptions: {
        Row: { id: string; client_id: string; endpoint: string; p256dh: string; auth: string; created_at: string | null };
        Insert: { client_id: string; endpoint: string; p256dh: string; auth: string; id?: string; created_at?: string | null };
        Update: Partial<{ client_id: string; endpoint: string; p256dh: string; auth: string }>;
      };
      scheduling_contacts: {
        Row: { id: string; therapist_id: string; name: string; phone: string; created_at: string };
        Insert: { therapist_id: string; name: string; phone: string; id?: string; created_at?: string };
        Update: Partial<{ name: string; phone: string }>;
      };
      bot_subscriptions: {
        Row: {
          id: string;
          client_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: 'active' | 'past_due' | 'canceled';
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status: 'active' | 'past_due' | 'canceled';
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: 'active' | 'past_due' | 'canceled';
          current_period_end: string | null;
          updated_at: string;
        }>;
      };
      bot_messages: {
        Row: { id: string; client_id: string; role: 'user' | 'assistant'; content: string; created_at: string };
        Insert: { id?: string; client_id: string; role: 'user' | 'assistant'; content: string; created_at?: string };
        Update: Partial<{ content: string }>;
      };
      roteiros: {
        Row: Roteiro;
        Insert: Partial<Omit<Roteiro, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & { user_id: string; id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Roteiro, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
};
