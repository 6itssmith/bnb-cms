"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStaffProfile } from "@/lib/StaffProfileContext";
import { isSuperAdmin } from "@/lib/auth";
import StaffApprovalPanel from "@/components/StaffApprovalPanel";
import AuditLogTable from "@/components/AuditLogTable";
import { PageLoading, NotPermitted } from "@/components/PageStates";
import { Terminal } from "lucide-react";
import type { StaffProfile, AuditLogEntry } from "@/lib/types";

export default function SettingsPage() {
  const { profile, loading: profileLoading } = useStaffProfile();
  const [staff, setStaff] = useState<StaffProfile[] | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    document.title = "Settings | Aura Crib CMS";
    if (profileLoading || !isSuperAdmin(profile)) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("staff_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
    ]).then(([{ data: staffData }, { data: auditData }]) => {
      setStaff((staffData as StaffProfile[]) ?? []);
      setAuditLog((auditData as AuditLogEntry[]) ?? []);
    });
  }, [profileLoading, profile]);

  if (profileLoading) return <PageLoading />;
  if (!isSuperAdmin(profile)) return <NotPermitted />;
  if (staff === null) return <PageLoading />;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Settings</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">Super Admin only.</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-bold text-earth-dark dark:text-cream">Staff</h2>
        <StaffApprovalPanel staff={staff} currentStaffId={profile!.id} />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-earth-dark dark:text-cream">Payment providers</h2>
        <div className="card p-4 flex gap-3 items-start">
          <Terminal className="w-4 h-4 text-ink/40 dark:text-cream/40 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-ink/60 dark:text-cream/60">
            Payment provider secrets (M-Pesa, Stripe, PayPal) live in the shared Supabase
            project's Edge Function secrets, not in this static app — there's nothing for the CMS
            to read here to show a live "configured" status without a server of its own. Verify
            configuration with <code className="mx-1">supabase secrets list</code> from the guest
            site's repo, or in the Supabase dashboard under Edge Functions → Secrets.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-earth-dark dark:text-cream">Audit log</h2>
        <AuditLogTable entries={auditLog} staff={staff} />
      </section>
    </div>
  );
}
