import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase Connection Attempted');
console.log('Supabase URL Loaded:', !!supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Site will show MISSING KEYS.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

console.log("Supabase initialized:", !!supabase);
