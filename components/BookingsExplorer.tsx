"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";
import type { Booking, BookingStatus } from "@/lib/types";
import BookingDetailDrawer from "@/components/BookingDetailDrawer";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending_payment: "bg-gold/20 text-earth-dark",
  confirmed: "bg-moss/15 text-moss-dark",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-lagoon/15 text-lagoon-dark",
};

export default function BookingsExplorer({
  bookings,
  canManage,
}: {
  bookings: Booking[];
  canManage: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [list, setList] = useState(bookings);

  const filtered = useMemo(() => {
    return list.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (query && !b.guest_name.toLowerCase().includes(query.toLowerCase())) return false;
      if (from && b.check_in < from) return false;
      if (to && b.check_in > to) return false;
      return true;
    });
  }, [list, statusFilter, query, from, to]);

  function handleUpdated(updated: Booking) {
    setList((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelected(updated);
  }

  return (
    <>
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-ink/60 dark:text-cream/60 mb-1">Guest name</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden="true" />
            <input
              className="input pl-9"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-ink/60 dark:text-cream/60 mb-1">Status</label>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "all")}
          >
            <option value="all">All</option>
            <option value="pending_payment">Pending payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-ink/60 dark:text-cream/60 mb-1">Check-in from</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-ink/60 dark:text-cream/60 mb-1">Check-in to</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-bold text-ink/50 dark:text-cream/50 border-b border-earth/10 dark:border-cream/10">
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
              <th className="px-4 py-3">Guests</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr
                key={b.id}
                onClick={() => setSelected(b)}
                className="border-b border-earth/5 dark:border-cream/5 last:border-0 hover:bg-earth/5 dark:hover:bg-cream/5 cursor-pointer"
              >
                <td className="px-4 py-3 font-semibold">{b.guest_name}</td>
                <td className="px-4 py-3">{format(new Date(`${b.check_in}T00:00:00`), "d MMM yyyy")}</td>
                <td className="px-4 py-3">{format(new Date(`${b.check_out}T00:00:00`), "d MMM yyyy")}</td>
                <td className="px-4 py-3">{b.guests}</td>
                <td className="px-4 py-3">
                  {b.currency} {Number(b.total_amount).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_STYLES[b.status]}`}>{b.status.replace("_", " ")}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink/50 dark:text-cream/50">
                  No bookings match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <BookingDetailDrawer
          booking={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </>
  );
}
