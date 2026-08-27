import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ojmaxsskczukdbxpaull.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXAiLCJyZWYiOiJvam1heHNza3NjemlrZGJ4cGF1bGwiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3Nzc2NzM1MSwiZXhwIjoyMDkzMzQzMzUxfQ.CL9IxI31OrDcZuTBh711TQjb8A5Ep0jveG7df58-dws';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Always use the configured app URL so invite links work even when
// the therapist is testing locally (localhost would break client access)
export const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
export const resetPasswordUrl = `${appUrl}/reset-password`;
