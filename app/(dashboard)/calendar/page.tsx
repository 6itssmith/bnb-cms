import { createClient } from "@/lib/supabase/server";
import { getStaffProfile, canManage } from "@/lib/auth";
import CalendarGrid from "@/components/CalendarGrid";
import type { BlockedDate, Booking } from "@/lib/types";

export const metadata = { title: "Calendar | Aura Crib CMS" };

export default async function CalendarPage() {
  const supabase = await createClient();
  const profile = await getStaffProfile();

  const [{ data: bookings }, { data: blocked }, { data: overrides }, { data: property }] = await Promise.all([
    supabase.from("bookings").select("id, check_in, check_out, guest_name, status").in("status", ["confirmed", "pending_payment", "completed"]),
    supabase.from("blocked_dates").select("*"),
    supabase.from("date_price_overrides").select("*"),
    supabase.from("property_content").select("base_price_per_night, currency").limit(1).single(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Calendar</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          Block dates or set a one-off nightly price. Booked nights are shown but managed from Bookings.
        </p>
      </div>

      <CalendarGrid
        bookings={(bookings as Pick<Booking, "id" | "check_in" | "check_out" | "guest_name" | "status">[]) ?? []}
        blockedDates={(blocked as BlockedDate[]) ?? []}
        overrides={overrides ?? []}
        basePrice={property?.base_price_per_night ?? 0}
        currency={property?.currency ?? "KES"}
        canManage={canManage(profile)}
      />
    </div>
  );
}
