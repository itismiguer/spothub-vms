import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.warn('Missing Anon Key');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing! Site will show MISSING KEYS.');
}

console.log('Supabase Connection Attempted');
console.log('Supabase URL Loaded:', !!supabaseUrl);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

console.log("Supabase initialized:", !!supabase);
