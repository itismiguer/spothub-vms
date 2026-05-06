import { createClient } from '@supabase/supabase-js'

// Robust environment variable loader with cleaning
const cleanEnv = (val: string | undefined): string => {
  if (!val) return '';
  // Remove /rest/v1 or other common mistakes if they were accidentally added, then remove trailing slash
  return val.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
};

const supabaseUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
// Supabase setup
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Alert the developer if config is missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE] CRITICAL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. API requests will fail.');
} else {
  // Connection initialized
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
