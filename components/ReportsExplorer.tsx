"use client";

import { useMemo, useState } from "react";
import { eachDayOfInterval, format, subDays } from "date-fns";
import { Download } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Wallet, Percent, BookOpen } from "lucide-react";
import type { Booking } from "@/lib/types";

const ACTIVE = new Set(["confirmed", "completed"]);

function toCsv(bookings: Booking[]): string {
  const headers = [
    "id",
    "guest_name",
    "check_in",
    "check_out",
    "guests",
    "total_amount",
    "currency",
    "status",
    "payment_method",
    "created_at",
  ];
  const rows = bookings.map((b) =>
    headers.map((h) => JSON.stringify((b as unknown as Record<string, unknown>)[h] ?? "")).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export default function ReportsExplorer({ bookings }: { bookings: Booking[] }) {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const inRange = useMemo(
    () => bookings.filter((b) => b.check_in >= from && b.check_in <= to),
    [bookings, from, to]
  );

  const revenue = inRange
    .filter((b) => ACTIVE.has(b.status))
    .reduce((sum, b) => sum + Number(b.total_amount), 0);

  const occupancy = useMemo(() => {
    const days = eachDayOfInterval({ start: new Date(`${from}T00:00:00`), end: new Date(`${to}T00:00:00`) });
    const occupiedDays = days.filter((day) =>
      bookings.some((b) => {
        if (!ACTIVE.has(b.status)) return false;
        const checkIn = new Date(`${b.check_in}T00:00:00`);
        const checkOut = new Date(`${b.check_out}T00:00:00`);
        return day >= checkIn && day < checkOut;
      })
    ).length;
    return Math.round((occupiedDays / Math.max(days.length, 1)) * 100);
  }, [bookings, from, to]);

  const currency = bookings[0]?.currency ?? "KES";

  function exportCsv() {
    const csv = toCsv(inRange);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-crib-bookings-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-bold text-ink/60 dark:text-cream/60 mb-1">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-ink/60 dark:text-cream/60 mb-1">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={exportCsv} className="btn-secondary text-sm ml-auto">
          <Download className="w-4 h-4" aria-hidden="true" /> Export CSV
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Revenue in range" value={`${currency} ${revenue.toLocaleString()}`} icon={Wallet} accent="text-gold" />
        <StatCard label="Occupancy in range" value={`${occupancy}%`} icon={Percent} accent="text-lagoon" />
        <StatCard label="Bookings in range" value={String(inRange.length)} icon={BookOpen} accent="text-moss" />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-bold text-ink/50 dark:text-cream/50 border-b border-earth/10 dark:border-cream/10">
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {inRange.map((b) => (
              <tr key={b.id} className="border-b border-earth/5 dark:border-cream/5 last:border-0">
                <td className="px-4 py-3">{b.guest_name}</td>
                <td className="px-4 py-3">{b.check_in}</td>
                <td className="px-4 py-3">{b.check_out}</td>
                <td className="px-4 py-3">
                  {b.currency} {Number(b.total_amount).toLocaleString()}
                </td>
                <td className="px-4 py-3 capitalize">{b.status.replace("_", " ")}</td>
              </tr>
            ))}
            {inRange.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink/50 dark:text-cream/50">
                  No bookings in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
