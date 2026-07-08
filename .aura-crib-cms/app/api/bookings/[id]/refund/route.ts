import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Refunds move money, so unlike everything else in this app (which relies
 * on RLS + the browser's own Supabase session), this goes through a server
 * Route Handler holding the service-role key — never sent to the browser —
 * which then calls the shared refund-payment Edge Function.
 *
 * Still checks the caller's own session is manager/super_admin first, so a
 * `staff`-role account can't hit this endpoint directly even though it
 * never touches their browser session for the actual refund call.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active" || !["manager", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : undefined;

  const admin = createAdminClient();
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const functionsUrl = projectUrl.replace(".supabase.co", ".functions.supabase.co");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${functionsUrl}/refund-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({ bookingId, reason }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? "Refund failed", details: data }, { status: res.status });
  }

  await admin.from("staff_audit_log").insert({
    actor_id: user.id,
    action: "booking.refunded",
    target_table: "bookings",
    target_id: bookingId,
    details: { reason: reason ?? null, result: data },
  });

  return NextResponse.json(data);
}
