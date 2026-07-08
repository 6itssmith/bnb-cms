import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffProfile, canManage } from "@/lib/auth";
import ReportsExplorer from "@/components/ReportsExplorer";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Reports | Aura Crib CMS" };

export default async function ReportsPage() {
  const profile = await getStaffProfile();
  if (!canManage(profile)) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select("*").order("check_in", { ascending: false }).limit(1000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Reports</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          Pick a date range for a revenue/occupancy summary, or export the underlying bookings.
        </p>
      </div>

      <ReportsExplorer bookings={(data as Booking[]) ?? []} />
    </div>
  );
}
