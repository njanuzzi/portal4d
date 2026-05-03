import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ojmaxsskczukdbxpaull.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbWF4c3NrY3p1a2RieHBhdWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjczNTEsImV4cCI6MjA5MzM0MzM1MX0.CL9IxI31OrDcZuTBh711TQjb8A5Ep0jveG7df58-dws';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
