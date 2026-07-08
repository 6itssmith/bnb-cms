import { createClient } from "@/lib/supabase/server";
import { getStaffProfile, canManage } from "@/lib/auth";
import BookingsExplorer from "@/components/BookingsExplorer";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Bookings | Aura Crib CMS" };

export default async function BookingsPage() {
  const supabase = await createClient();
  const profile = await getStaffProfile();

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Bookings</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          {canManage(profile) ? "View, cancel, and refund guest bookings." : "View guest bookings."}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">Couldn't load bookings: {error.message}</p>}

      <BookingsExplorer bookings={(data as Booking[]) ?? []} canManage={canManage(profile)} />
    </div>
  );
}
