"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X, LoaderCircle, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Booking } from "@/lib/types";

export default function BookingDetailDrawer({
  booking,
  canManage,
  onClose,
  onUpdated,
}: {
  booking: Booking;
  canManage: boolean;
  onClose: () => void;
  onUpdated: (b: Booking) => void;
}) {
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"cancel" | "refund" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);

async function saveNotes() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    // 🔑 THE FIX: Cast (supabase as any) right at the start of the chain
    const { data, error: err } = await (supabase as any)
      .from("bookings")
      .update({ notes })
      .eq("id", booking.id)
      .select()
      .single();
    setSaving(false);
    if (err) return setError(err.message);
    if (data) onUpdated(data as Booking);
  }

  async function cancelBooking() {
    setBusy("cancel");
    setError(null);
    const supabase = createClient();
    // 🔑 THE FIX: Cast (supabase as any) here as well
    const { data, error: err } = await (supabase as any)
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id)
      .select()
      .single();
    setBusy(null);
    if (err) return setError(err.message);
    if (data) onUpdated(data as Booking);
  }

  async function refundBooking() {
    setBusy("refund");
    setError(null);
    const supabase = createClient();
    try {
      // No server to proxy this through in a static build, so this calls
      // the refund-payment Edge Function directly. supabase.functions.invoke
      // automatically attaches the current user's access token — the
      // function itself verifies that token and checks the caller is an
      // active manager/super_admin before touching Stripe/PayPal/M-Pesa or
      // writing the audit log entry (see guest-site's
      // supabase/functions/refund-payment). No secret ever reaches the
      // browser; the service-role key stays inside the Edge Function.
      const { data, error: fnError } = await supabase.functions.invoke(
        "refund-payment",
        {
          body: { bookingId: booking.id, reason: "Refunded from CMS by staff" },
        },
      );
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      onUpdated({ ...booking, status: "cancelled" });
      setConfirmRefund(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setBusy(null);
    }
  }

  const canCancel =
    canManage &&
    (booking.status === "pending_payment" || booking.status === "confirmed");
  const canRefund =
    canManage && booking.status === "confirmed" && booking.payment_method;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white dark:bg-ink overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 h-16 border-b border-earth/10 dark:border-cream/10">
          <h2 className="font-bold text-earth-dark dark:text-cream">
            {booking.guest_name}
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-bold text-ink/50 dark:text-cream/50">
                Check-in
              </p>
              <p>
                {format(new Date(`${booking.check_in}T00:00:00`), "d MMM yyyy")}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-ink/50 dark:text-cream/50">
                Check-out
              </p>
              <p>
                {format(
                  new Date(`${booking.check_out}T00:00:00`),
                  "d MMM yyyy",
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-ink/50 dark:text-cream/50">
                Guests
              </p>
              <p>{booking.guests}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-ink/50 dark:text-cream/50">
                Status
              </p>
              <p className="capitalize">{booking.status.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-ink/50 dark:text-cream/50">
                Email
              </p>
              <p className="truncate">{booking.guest_email}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-ink/50 dark:text-cream/50">
                Phone
              </p>
              <p>{booking.guest_phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-ink/50 dark:text-cream/50">
                Total
              </p>
              <p>
                {booking.currency}{" "}
                {Number(booking.total_amount).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-ink/50 dark:text-cream/50">
                Payment method
              </p>
              <p className="capitalize">{booking.payment_method ?? "—"}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink/60 dark:text-cream/60 mb-1">
              Staff notes (never shown to the guest)
            </label>
            <textarea
              className="input min-h-[90px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canManage}
            />
            {canManage && (
              <button
                onClick={saveNotes}
                disabled={saving}
                className="btn-secondary text-xs mt-2"
              >
                {saving && (
                  <LoaderCircle
                    className="w-3 h-3 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Save notes
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {canManage && (canCancel || canRefund) && (
            <div className="border-t border-earth/10 dark:border-cream/10 pt-5 space-y-3">
              {canRefund && !confirmRefund && (
                <button
                  onClick={() => setConfirmRefund(true)}
                  disabled={busy !== null}
                  className="btn-secondary w-full text-red-600 border-red-200"
                >
                  Cancel & refund guest
                </button>
              )}
              {canRefund && confirmRefund && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 space-y-2">
                  <p className="text-xs text-red-700 flex items-center gap-1.5">
                    <TriangleAlert
                      className="w-3.5 h-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    This issues a real refund via {booking.payment_method} and
                    marks the booking cancelled. This can't be undone from here.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={refundBooking}
                      disabled={busy !== null}
                      className="btn-primary flex-1 text-xs"
                    >
                      {busy === "refund" && (
                        <LoaderCircle
                          className="w-3 h-3 animate-spin"
                          aria-hidden="true"
                        />
                      )}
                      Confirm refund
                    </button>
                    <button
                      onClick={() => setConfirmRefund(false)}
                      className="btn-secondary flex-1 text-xs"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
              {canCancel && !canRefund && (
                <button
                  onClick={cancelBooking}
                  disabled={busy !== null}
                  className="btn-secondary w-full text-red-600 border-red-200"
                >
                  {busy === "cancel" && (
                    <LoaderCircle
                      className="w-3 h-3 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  Cancel booking
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
