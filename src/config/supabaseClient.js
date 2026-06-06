import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── SECURITY GUARD: Refuse to boot if a service_role / admin key is detected ──
// The service_role key bypasses ALL Row Level Security policies.
// It must NEVER appear in frontend code. This guard makes the app crash loudly
// rather than silently leaking cross-tenant data.
if (supabaseAnonKey) {
  try {
    // JWT payload is base64url-encoded middle segment
    const payloadB64 = supabaseAnonKey.split('.')[1];
    if (payloadB64) {
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
      if (payload?.role && payload.role !== 'anon') {
        // Throw synchronously so the entire React tree fails to mount
        throw new Error(
          `[SECURITY CRITICAL] Supabase key has role="${payload.role}" — ` +
          `only the "anon" public key is permitted in the frontend. ` +
          `NEVER ship a service_role or admin key to the browser.`
        );
      }
    }
  } catch (e) {
    // Re-throw security violations; swallow JSON/base64 parse errors (not our key)
    if (e.message?.startsWith('[SECURITY CRITICAL]')) throw e;
  }
}

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
