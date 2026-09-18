import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Always use the configured app URL so invite links work even when
// the therapist is testing locally (localhost would break client access)
export const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
export const resetPasswordUrl = `${appUrl}/reset-password`;
