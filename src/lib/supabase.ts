import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log to the browser console so we can see if it's blank
console.log('Checking connection setup...')
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase variables are UNDEFINED in the build.')
}

export const supabase = createClient(
  (supabaseUrl || '').trim(),
  (supabaseAnonKey || '').trim()
)
