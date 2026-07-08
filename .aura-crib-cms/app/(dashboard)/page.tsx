import { CalendarCheck, CalendarX, Wallet, Hourglass, Percent } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/StatCard";
import TrendCharts from "@/components/TrendCharts";
import {
  buildTrend,
  occupancyRate,
  monthlyRevenue,
  todayCheckIns,
  todayCheckOuts,
  pendingCount,
} from "@/lib/metrics";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Overview | Aura Crib CMS" };

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("check_in", { ascending: false })
    .limit(500);

  const bookings = (data as Booking[]) ?? [];
  const currency = bookings[0]?.currency ?? "KES";

  const checkIns = todayCheckIns(bookings);
  const checkOuts = todayCheckOuts(bookings);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Overview</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          A snapshot of how the property is doing right now.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          Couldn't load bookings: {error.message}
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Occupancy (30d)"
          value={`${occupancyRate(bookings, 30)}%`}
          icon={Percent}
          accent="text-lagoon"
        />
        <StatCard
          label="Check-ins today"
          value={String(checkIns.length)}
          icon={CalendarCheck}
          accent="text-moss"
        />
        <StatCard
          label="Check-outs today"
          value={String(checkOuts.length)}
          icon={CalendarX}
          accent="text-earth-dark"
        />
        <StatCard
          label="Revenue this month"
          value={`${currency} ${monthlyRevenue(bookings).toLocaleString()}`}
          icon={Wallet}
          accent="text-gold"
        />
        <StatCard
          label="Pending bookings"
          value={String(pendingCount(bookings))}
          icon={Hourglass}
          accent="text-earth"
        />
      </div>

      <TrendCharts last30={buildTrend(bookings, 30)} last90={buildTrend(bookings, 90)} currency={currency} />

      {(checkIns.length > 0 || checkOuts.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {checkIns.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-ink/70 dark:text-cream/70 mb-3">Arriving today</h3>
              <ul className="space-y-2 text-sm">
                {checkIns.map((b) => (
                  <li key={b.id} className="flex justify-between">
                    <span>{b.guest_name}</span>
                    <span className="text-ink/50 dark:text-cream/50">{b.guests} guests</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {checkOuts.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-bold text-ink/70 dark:text-cream/70 mb-3">Departing today</h3>
              <ul className="space-y-2 text-sm">
                {checkOuts.map((b) => (
                  <li key={b.id} className="flex justify-between">
                    <span>{b.guest_name}</span>
                    <span className="text-ink/50 dark:text-cream/50">{b.guests} guests</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
