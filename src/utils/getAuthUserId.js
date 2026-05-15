import { supabase } from '../config/supabaseClient';

/**
 * Resolves the authenticated user's UUID from the active Supabase session.
 * Uses getUser() (server-verified) rather than the client-side session cache.
 *
 * @returns {Promise<string>} The user's UUID
 * @throws  {Error}          If the user is not authenticated
 */
export async function getAuthUserId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User is not authenticated. Cannot save record.');
  }
  return user.id;
}
