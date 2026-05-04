import { createClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawUrl.replace(/\/$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Log to the browser console so we can see if it's blank
console.log('RESERVE: Initializing Supabase Connection...');
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL ERROR: Supabase environment variables are UNDEFINED or EMPTY.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)
