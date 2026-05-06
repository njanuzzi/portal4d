import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ojmaxsskczukdbxpaull.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbWF4c3NrY3p1a2RieHBhdWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjczNTEsImV4cCI6MjA5MzM0MzM1MX0.CL9IxI31OrDcZuTBh711TQjb8A5Ep0jveG7df58-dws';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Always use the configured app URL so invite links work even when
// the therapist is testing locally (localhost would break client access)
export const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
export const resetPasswordUrl = `${appUrl}/reset-password`;
