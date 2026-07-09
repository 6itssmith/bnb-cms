import type { StaffProfile } from "@/lib/types";

// Pure helpers only — the profile itself now comes from
// StaffProfileContext (client-side), not a server fetch. Kept as plain
// functions of a StaffProfile so components can import them without
// caring where the profile came from.

export function canManage(profile: StaffProfile | null): boolean {
  return profile?.role === "super_admin" || profile?.role === "manager";
}

export function isSuperAdmin(profile: StaffProfile | null): boolean {
  return profile?.role === "super_admin";
}
