"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStaffProfile } from "@/lib/StaffProfileContext";
import { canManage } from "@/lib/auth";
import HousekeepingBoard from "@/components/HousekeepingBoard";
import { PageLoading } from "@/components/PageStates";
import type { HousekeepingTask, StaffProfile } from "@/lib/types";

export default function HousekeepingPage() {
  const { profile } = useStaffProfile();
  const [tasks, setTasks] = useState<HousekeepingTask[] | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);

  useEffect(() => {
    document.title = "Housekeeping | Aura Crib CMS";
    const supabase = createClient();
    Promise.all([
      supabase.from("housekeeping_tasks").select("*").order("due_date", { ascending: true }),
      supabase.from("staff_profiles").select("*").eq("status", "active"),
    ]).then(([{ data: taskData }, { data: staffData }]) => {
      setTasks((taskData as HousekeepingTask[]) ?? []);
      setStaff((staffData as StaffProfile[]) ?? []);
    });
  }, []);

  if (tasks === null) return <PageLoading />;

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
        tasks={tasks}
        staff={staff}
        currentStaffId={profile?.id ?? ""}
        canManage={canManage(profile)}
      />
    </div>
  );
}
