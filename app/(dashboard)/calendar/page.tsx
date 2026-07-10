"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStaffProfile } from "@/lib/StaffProfileContext";
import { canManage } from "@/lib/auth";
import CalendarGrid from "@/components/CalendarGrid";
import { PageLoading } from "@/components/PageStates";
import type { BlockedDate, Booking } from "@/lib/types";

type CalendarData = {
  bookings: Pick<Booking, "id" | "check_in" | "check_out" | "guest_name" | "status">[];
  blockedDates: BlockedDate[];
  overrides: { date: string; price: number }[];
  basePrice: number;
  currency: string;
};

export default function CalendarPage() {
  const { profile } = useStaffProfile();
  const [data, setData] = useState<CalendarData | null>(null);

  useEffect(() => {
    document.title = "Calendar | Aura Crib CMS";
    const supabase = createClient();
    Promise.all([
      supabase
        .from("bookings")
        .select("id, check_in, check_out, guest_name, status")
        .in("status", ["confirmed", "pending_payment", "completed"]),
      supabase.from("blocked_dates").select("*"),
      supabase.from("date_price_overrides").select("*"),
      supabase.from("property_content").select("base_price_per_night, currency").limit(1).maybeSingle(),
    ]).then(([{ data: bookings }, { data: blocked }, { data: overrides }, { data: property }]) => {
      setData({
        bookings: (bookings as CalendarData["bookings"]) ?? [],
        blockedDates: (blocked as BlockedDate[]) ?? [],
        overrides: overrides ?? [],
       // FIXED TYPE CASTING FOR THE COMPILER
basePrice: (property as any)?.base_price_per_night ?? 0,
currency: (property as any)?.currency ?? "KES",
      });
    });
  }, []);

  if (!data) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Calendar</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          Block dates or set a one-off nightly price. Booked nights are shown but managed from Bookings.
        </p>
      </div>

      <CalendarGrid
        bookings={data.bookings}
        blockedDates={data.blockedDates}
        overrides={data.overrides}
        basePrice={data.basePrice}
        currency={data.currency}
        canManage={canManage(profile)}
      />
    </div>
  );
}
