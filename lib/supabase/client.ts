import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Plain browser client. Previously used @supabase/ssr's createBrowserClient
 * (which syncs the session into cookies for a server to read) — with no
 * server left in this static build, that's unnecessary, so this is just
 * the standard client with its default localStorage session persistence.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
