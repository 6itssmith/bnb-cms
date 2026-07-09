"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStaffProfile } from "@/lib/StaffProfileContext";
import { canManage } from "@/lib/auth";
import BookingsExplorer from "@/components/BookingsExplorer";
import { PageLoading } from "@/components/PageStates";
import type { Booking } from "@/lib/types";

export default function BookingsPage() {
  const { profile } = useStaffProfile();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Bookings | Aura Crib CMS";
    const supabase = createClient();
    supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setBookings((data as Booking[]) ?? []);
      });
  }, []);

  if (bookings === null) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Bookings</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          {canManage(profile) ? "View, cancel, and refund guest bookings." : "View guest bookings."}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">Couldn't load bookings: {error}</p>}

      <BookingsExplorer bookings={bookings} canManage={canManage(profile)} />
    </div>
  );
}
