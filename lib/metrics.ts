import { eachDayOfInterval, format, isWithinInterval, subDays, startOfMonth } from "date-fns";
import type { Booking } from "@/lib/types";

const ACTIVE_STATUSES = new Set(["confirmed", "completed"]);

/** Whether the property is booked on a given calendar day (single property → binary). */
function isOccupied(day: Date, bookings: Booking[]): boolean {
  return bookings.some((b) => {
    if (!ACTIVE_STATUSES.has(b.status)) return false;
    const checkIn = new Date(`${b.check_in}T00:00:00`);
    const checkOut = new Date(`${b.check_out}T00:00:00`);
    return day >= checkIn && day < checkOut;
  });
}

export type TrendPoint = { date: string; label: string; revenue: number; occupied: number };

export function buildTrend(bookings: Booking[], days: number): TrendPoint[] {
  const end = new Date();
  const start = subDays(end, days - 1);
  const range = eachDayOfInterval({ start, end });

  return range.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    // Revenue attributed to the day a booking was confirmed (check_in date,
    // as a simple, explainable proxy — created_at would double-count a
    // booking spanning multiple report days).
    const revenue = bookings
      .filter((b) => ACTIVE_STATUSES.has(b.status) && b.check_in === dayKey)
      .reduce((sum, b) => sum + Number(b.total_amount), 0);

    return {
      date: dayKey,
      label: format(day, "d MMM"),
      revenue,
      occupied: isOccupied(day, bookings) ? 100 : 0,
    };
  });
}

export function occupancyRate(bookings: Booking[], days: number): number {
  const end = new Date();
  const start = subDays(end, days - 1);
  const range = eachDayOfInterval({ start, end });
  const occupiedDays = range.filter((day) => isOccupied(day, bookings)).length;
  return Math.round((occupiedDays / range.length) * 100);
}

export function monthlyRevenue(bookings: Booking[]): number {
  const start = startOfMonth(new Date());
  return bookings
    .filter(
      (b) =>
        ACTIVE_STATUSES.has(b.status) &&
        isWithinInterval(new Date(`${b.check_in}T00:00:00`), { start, end: new Date() })
    )
    .reduce((sum, b) => sum + Number(b.total_amount), 0);
}

export function todayCheckIns(bookings: Booking[]): Booking[] {
  const today = format(new Date(), "yyyy-MM-dd");
  return bookings.filter((b) => b.check_in === today && ACTIVE_STATUSES.has(b.status));
}

export function todayCheckOuts(bookings: Booking[]): Booking[] {
  const today = format(new Date(), "yyyy-MM-dd");
  return bookings.filter((b) => b.check_out === today && ACTIVE_STATUSES.has(b.status));
}

export function pendingCount(bookings: Booking[]): number {
  return bookings.filter((b) => b.status === "pending_payment").length;
}
