import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Keep a single instance cached outside of the function scope
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Plain browser client. Previously used @supabase/ssr's createBrowserClient
 * (which syncs the session into cookies for a server to read) — with no
 * server left in this static build, that's unnecessary, so this is just
 * the standard client with its default localStorage session persistence.
 * 
 * Refactored to a Singleton Pattern to prevent multiple client instances 
 * from causing infinite loops during client-side auth state listeners.
 */
export function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseInstance;
}