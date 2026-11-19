import { createClient } from '@supabase/supabase-js';

// Server-only client. Uses the secret key, so never import this in a client component.
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}
