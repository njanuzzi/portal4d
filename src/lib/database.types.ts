export type Role = 'therapist' | 'client';
export type QuestionType = 'text' | 'number' | 'scale';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  whatsapp?: string | null;
  address?: string | null;
  created_at: string;
}

export interface Diary {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiaryQuestion {
  id: string;
  diary_id: string;
  order_num: number;
  text: string;
  type: QuestionType;
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

// Joined types
export interface DiaryEntryWithAnswers extends DiaryEntry {
  answers: (EntryAnswer & { question: DiaryQuestion })[];
  diary: Diary;
}

export interface ReportWithProfile extends Report {
  profile?: Profile;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      diaries: {
        Row: Diary;
        Insert: Omit<Diary, 'id' | 'created_at' | 'updated_at'>;
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
    };
  };
};
