import { createClient } from '@supabase/supabase-js'

// Robust environment variable loader with cleaning
const cleanEnv = (val: string | undefined): string => {
  if (!val) return '';
  return val.trim().replace(/\/$/, '');
};

const supabaseUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Alert the developer if config is missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[SUPABASE] CRITICAL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. API requests will fail.');
} else {
  console.log(`[SUPABASE] Initialized for: ${supabaseUrl.split('//')[1]?.split('.')[0] || 'Unknown Project'}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  }
});
