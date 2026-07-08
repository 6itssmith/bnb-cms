import { createClient } from "@/lib/supabase/server";
import { getStaffProfile, canManage } from "@/lib/auth";
import HousekeepingBoard from "@/components/HousekeepingBoard";
import type { HousekeepingTask, StaffProfile } from "@/lib/types";

export const metadata = { title: "Housekeeping | Aura Crib CMS" };

export default async function HousekeepingPage() {
  const supabase = await createClient();
  const profile = await getStaffProfile();

  const [{ data: tasks }, { data: staff }] = await Promise.all([
    supabase.from("housekeeping_tasks").select("*").order("due_date", { ascending: true }),
    supabase.from("staff_profiles").select("*").eq("status", "active"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Housekeeping</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          Auto-suggested from confirmed bookings, plus anything added manually. Staff can update
          tasks assigned to them; managers can assign and edit any task.
        </p>
      </div>

      <HousekeepingBoard
        tasks={(tasks as HousekeepingTask[]) ?? []}
        staff={(staff as StaffProfile[]) ?? []}
        currentStaffId={profile?.id ?? ""}
        canManage={canManage(profile)}
      />
    </div>
  );
}
