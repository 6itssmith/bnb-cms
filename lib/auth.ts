import { createClient } from "@/lib/supabase/server";
import type { StaffProfile } from "@/lib/types";

/**
 * Fetches the signed-in user's staff_profiles row. Returns null if there's
 * no session or no profile yet. Server Components use this for anything
 * role-dependent (e.g. hiding the "Settings" nav item for plain staff) —
 * this is UX only; the actual restriction is enforced by RLS regardless of
 * what this function returns.
 */
export async function getStaffProfile(): Promise<StaffProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as StaffProfile) ?? null;
}

export function canManage(profile: StaffProfile | null): boolean {
  return profile?.role === "super_admin" || profile?.role === "manager";
}

export function isSuperAdmin(profile: StaffProfile | null): boolean {
  return profile?.role === "super_admin";
}
