import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffProfile, isSuperAdmin } from "@/lib/auth";
import StaffApprovalPanel from "@/components/StaffApprovalPanel";
import AuditLogTable from "@/components/AuditLogTable";
import { CheckCircle2, XCircle } from "lucide-react";
import type { StaffProfile, AuditLogEntry } from "@/lib/types";

export const metadata = { title: "Settings | Aura Crib CMS" };

// Read-only visibility into whether payment provider secrets are configured.
// The CMS never displays or edits the actual key values — those are set
// with `supabase secrets set` per PAYMENT_SANDBOX_SETUP.md, out of band.
const PAYMENT_ENV_CHECKS = [
  { label: "M-Pesa (Daraja)", envVar: "MPESA_CONSUMER_KEY" },
  { label: "Stripe", envVar: "STRIPE_SECRET_KEY" },
  { label: "PayPal", envVar: "PAYPAL_CLIENT_ID" },
];

export default async function SettingsPage() {
  const profile = await getStaffProfile();
  if (!isSuperAdmin(profile)) redirect("/");

  const supabase = await createClient();
  const [{ data: staff }, { data: auditLog }] = await Promise.all([
    supabase.from("staff_profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("staff_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Settings</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">Super Admin only.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold text-earth-dark dark:text-cream">Staff</h2>
        <StaffApprovalPanel staff={(staff as StaffProfile[]) ?? []} currentStaffId={profile!.id} />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-earth-dark dark:text-cream">Payment providers</h2>
        <p className="text-xs text-ink/50 dark:text-cream/50">
          Configuration status only — keys are managed via Supabase secrets, never here.
        </p>
        <div className="card divide-y divide-earth/10 dark:divide-cream/10">
          {PAYMENT_ENV_CHECKS.map((p) => {
            const configured = Boolean(process.env[p.envVar]);
            return (
              <div key={p.envVar} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-semibold">{p.label}</span>
                {configured ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-moss">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-ink/40 dark:text-cream/40">
                    <XCircle className="w-4 h-4" aria-hidden="true" /> Not set here
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-ink/40 dark:text-cream/40">
          Note: provider secrets live in the shared Supabase project's Edge Function secrets, not
          this app's environment — this panel checks the CMS's own env as a convenience and may
          read "Not set here" even when the Edge Functions are correctly configured. Verify with
          <code className="mx-1">supabase secrets list</code> for a definitive answer.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-earth-dark dark:text-cream">Audit log</h2>
        <AuditLogTable entries={(auditLog as AuditLogEntry[]) ?? []} staff={(staff as StaffProfile[]) ?? []} />
      </section>
    </div>
  );
}
