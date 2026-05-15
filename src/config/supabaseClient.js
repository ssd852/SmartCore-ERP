import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseReady =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_') &&
  !supabaseAnonKey.includes('YOUR_');

export const supabase = supabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
