import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Only ever import this inside Route Handlers
 * (`app/api/**`) — never in a Client Component or anything that ends up in
 * the browser bundle. Used for the one operation regular staff RLS can't
 * cover: triggering the `refund-payment` Edge Function, which itself
 * requires the service-role key as a shared secret.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
