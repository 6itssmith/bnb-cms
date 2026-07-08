// refund-payment
//
// Called from the CMS's booking detail drawer when staff cancel a
// confirmed, paid booking. Not exposed to the guest browser — the guest
// site never has a reason to call this, and it moves money, so it's
// locked down harder than the guest-facing functions:
//
//   The Authorization header must be the project's own service-role key
//   (not just any valid JWT). The CMS holds this key server-side only
//   (its own Route Handler, see aura-crib-cms/app/api/bookings/[id]/refund),
//   so the guest browser bundle never sees it and can't call this function.
//
// Stripe and PayPal support programmatic refunds and are handled here.
// M-Pesa (Daraja) sandbox has no reversal API — per the CMS build plan's
// stated assumption, M-Pesa refunds are manual/out-of-band; this function
// just records a note on the payment row and lets staff complete the
// reversal themselves via Safaricom's business channels.
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-injected on Supabase)
//   STRIPE_SECRET_KEY
//   PAYPAL_ENV, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function paypalBase() {
  return Deno.env.get("PAYPAL_ENV") === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function paypalAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID")!;
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  // Only the CMS's own server calls this, using the service-role key as a
  // shared secret. `verify_jwt` (project default) already rejects requests
  // without a validly-signed JWT; this extra check confirms it's *this
  // specific* privileged key, not just any authenticated guest/staff token.
  const authHeader = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (authHeader !== `Bearer ${serviceKey}`) {
    return json({ error: "Forbidden" }, 403);
  }

  try {
    const { bookingId, reason } = await req.json();
    if (!bookingId) return json({ error: "bookingId is required" }, 400);

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, payment_method, total_amount, currency, status")
      .eq("id", bookingId)
      .single();
    if (bookingErr || !booking) return json({ error: "Booking not found" }, 404);

    const { data: payment } = await supabase
      .from("payments")
      .select("id, provider, provider_ref, amount")
      .eq("booking_id", bookingId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!payment) {
      return json({ error: "No successful payment found for this booking" }, 400);
    }

    let refundResult: Record<string, unknown> = {};

    if (payment.provider === "stripe") {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
        apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
      });
      // provider_ref stores the PaymentIntent id for Stripe (see
      // create-payment-intent). Refunding by PaymentIntent covers both
      // direct PaymentIntents and PaymentIntents created via Checkout.
      const refund = await stripe.refunds.create({ payment_intent: payment.provider_ref! });
      refundResult = { stripeRefundId: refund.id, status: refund.status };
    } else if (payment.provider === "paypal") {
      const token = await paypalAccessToken();
      // provider_ref stores the PayPal order id; refunds are issued against
      // the *capture* id, which we don't currently persist separately — if
      // paypal-capture starts storing the capture id, prefer that here.
      const res = await fetch(
        `${paypalBase()}/v2/payments/captures/${payment.provider_ref}/refund`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ note_to_payer: reason ?? "Refund issued by property manager" }),
        }
      );
      refundResult = await res.json();
      if (!res.ok) {
        return json({ error: "PayPal refund failed", details: refundResult }, 502);
      }
    } else if (payment.provider === "mpesa") {
      // No programmatic reversal in Daraja sandbox — record the request so
      // staff can action it manually, and surface that clearly to the CMS.
      refundResult = { manual: true, note: "M-Pesa reversal must be completed manually via Safaricom" };
    } else {
      return json({ error: `Unknown provider: ${payment.provider}` }, 400);
    }

    await supabase
      .from("payments")
      .update({
        status: payment.provider === "mpesa" ? payment.status : "failed", // "failed" here doubles as "reversed" until a dedicated status is added
        raw_payload: { ...refundResult, refund_reason: reason ?? null },
      })
      .eq("id", payment.id);

    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);

    return json({ ok: true, provider: payment.provider, ...refundResult });
  } catch (err) {
    console.error("refund-payment error:", err);
    return json({ error: "Internal error processing refund" }, 500);
  }
});
