"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Booking, BlockedDate } from "@/lib/types";

type Override = { date: string; price: number };

export default function CalendarGrid({
  bookings,
  blockedDates,
  overrides,
  basePrice,
  currency,
  canManage,
}: {
  bookings: Pick<Booking, "id" | "check_in" | "check_out" | "guest_name" | "status">[];
  blockedDates: BlockedDate[];
  overrides: Override[];
  basePrice: number;
  currency: string;
  canManage: boolean;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [blocked, setBlocked] = useState(new Map(blockedDates.map((b) => [b.date, b])));
  const [priceMap, setPriceMap] = useState(new Map(overrides.map((o) => [o.date, o.price])));
  const [selected, setSelected] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const leadingBlanks = getDay(startOfMonth(month));

  function bookingFor(dayKey: string) {
    return bookings.find(
      (b) => b.status !== "cancelled" && dayKey >= b.check_in && dayKey < b.check_out
    );
  }

  async function toggleBlock(dayKey: string) {
    if (!canManage) return;
    setBusy(true);
    const supabase = createClient();
    const existing = blocked.get(dayKey);

    if (existing) {
      const { error } = await supabase.from("blocked_dates").delete().eq("id", existing.id);
      if (!error) {
        const next = new Map(blocked);
        next.delete(dayKey);
        setBlocked(next);
      }
    } else {
      const { data, error } = await supabase
        .from("blocked_dates")
        .insert({ date: dayKey, reason: "Blocked from CMS calendar" })
        .select()
        .single();
      if (!error && data) {
        const next = new Map(blocked);
        next.set(dayKey, data as BlockedDate);
        setBlocked(next);
      }
    }
    setBusy(false);
  }

  async function savePrice(dayKey: string) {
    if (!canManage) return;
    const price = Number(priceInput);
    if (!Number.isFinite(price) || price <= 0) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("date_price_overrides")
      .upsert({ date: dayKey, price }, { onConflict: "date" });
    if (!error) {
      const next = new Map(priceMap);
      next.set(dayKey, price);
      setPriceMap(next);
    }
    setBusy(false);
    setSelected(null);
  }

  async function clearPrice(dayKey: string) {
    if (!canManage) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("date_price_overrides").delete().eq("date", dayKey);
    if (!error) {
      const next = new Map(priceMap);
      next.delete(dayKey);
      setPriceMap(next);
    }
    setBusy(false);
    setSelected(null);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => setMonth((m) => subMonths(m, 1))} className="p-2 hover:bg-earth/5 dark:hover:bg-cream/10 rounded-lg" aria-label="Previous month">
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h2 className="font-bold text-earth-dark dark:text-cream">{format(month, "MMMM yyyy")}</h2>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-2 hover:bg-earth/5 dark:hover:bg-cream/10 rounded-lg" aria-label="Next month">
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-ink/50 dark:text-cream/50 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const booking = bookingFor(dayKey);
          const isBlocked = blocked.has(dayKey);
          const price = priceMap.get(dayKey);
          const isSelected = selected === dayKey;

          let tone = "bg-white dark:bg-ink/40 border-earth/10 dark:border-cream/10";
          if (booking) tone = "bg-moss/15 border-moss/30";
          else if (isBlocked) tone = "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900";

          return (
            <div key={dayKey} className="relative">
              <button
                onClick={() => {
                  if (booking) return;
                  setSelected(isSelected ? null : dayKey);
                  setPriceInput(price ? String(price) : "");
                }}
                disabled={!!booking}
                className={`w-full aspect-square rounded-lg border text-xs p-1.5 flex flex-col items-start justify-between ${tone} ${
                  booking ? "cursor-default" : "cursor-pointer hover:border-lagoon"
                }`}
                title={booking ? `Booked: ${booking.guest_name}` : undefined}
              >
                <span className="font-bold">{format(day, "d")}</span>
                {price && !booking && (
                  <span className="text-[10px] text-gold font-bold">{currency} {price.toLocaleString()}</span>
                )}
              </button>

              {isSelected && !booking && (
                <div className="absolute z-10 top-full mt-1 left-0 w-52 card p-3 space-y-2 shadow-xl">
                  <p className="text-xs font-bold">{format(day, "d MMM yyyy")}</p>
                  <button
                    onClick={() => toggleBlock(dayKey)}
                    disabled={busy}
                    className="btn-secondary w-full text-xs"
                  >
                    {busy && <LoaderCircle className="w-3 h-3 animate-spin" aria-hidden="true" />}
                    {isBlocked ? "Unblock date" : "Block date"}
                  </button>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      className="input text-xs"
                      placeholder={`${basePrice}`}
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                    />
                    <button onClick={() => savePrice(dayKey)} disabled={busy} className="btn-primary text-xs px-3">
                      Set
                    </button>
                  </div>
                  {price && (
                    <button onClick={() => clearPrice(dayKey)} className="text-xs text-ink/50 hover:underline">
                      Clear override
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-5 text-xs text-ink/60 dark:text-cream/60">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-moss/40" /> Booked</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200" /> Blocked</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gold/40" /> Price override</span>
      </div>
    </div>
  );
}
