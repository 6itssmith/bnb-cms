"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStaffProfile } from "@/lib/StaffProfileContext";
import { canManage } from "@/lib/auth";
import ReportsExplorer from "@/components/ReportsExplorer";
import { PageLoading, NotPermitted } from "@/components/PageStates";
import type { Booking } from "@/lib/types";

export default function ReportsPage() {
  const { profile, loading: profileLoading } = useStaffProfile();
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    document.title = "Reports | Aura Crib CMS";
    if (profileLoading || !canManage(profile)) return;
    const supabase = createClient();
    supabase
      .from("bookings")
      .select("*")
      .order("check_in", { ascending: false })
      .limit(1000)
      .then(({ data }) => setBookings((data as Booking[]) ?? []));
  }, [profileLoading, profile]);

  if (profileLoading) return <PageLoading />;
  if (!canManage(profile)) return <NotPermitted />;
  if (bookings === null) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Reports</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          Pick a date range for a revenue/occupancy summary, or export the underlying bookings.
        </p>
      </div>

      <ReportsExplorer bookings={bookings} />
    </div>
  );
}
