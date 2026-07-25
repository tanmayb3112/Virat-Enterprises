import { createClient } from "@supabase/supabase-js";

// Service-role client for server-side API routes (bypasses RLS). Returns null
// when not configured so routes can fall back to the manual workflow.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
