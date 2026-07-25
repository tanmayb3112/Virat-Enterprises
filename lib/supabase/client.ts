"use client";

import { createBrowserClient } from "@supabase/ssr";

// Returns a browser Supabase client, or null when the project is not configured
// (site runs in demo/manual mode). Callers must handle null.
export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
