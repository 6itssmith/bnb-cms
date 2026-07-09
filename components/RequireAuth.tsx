"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useStaffProfile } from "@/lib/StaffProfileContext";

/**
 * Wrap anything under `/(dashboard)` with this. Static export has no
 * server, so there's no way to redirect before the first paint the way
 * `middleware.ts` used to — there will always be a brief loading state
 * instead of a hard pre-render redirect. This keeps that window as short
 * and inert as possible: nothing dashboard-shaped renders until the
 * session + profile check resolves.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, profile, loading } = useStaffProfile();
  const [suspending, setSuspending] = useState(false);

  useEffect(() => {
    if (loading || suspending) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    if (!profile || profile.status === "pending") {
      router.replace("/pending-approval");
      return;
    }

    if (profile.status === "suspended") {
      setSuspending(true);
      const supabase = createClient();
      supabase.auth.signOut().then(() => {
        router.replace("/login?suspended=1");
      });
    }
  }, [loading, session, profile, suspending, router]);

  if (loading || !session || !profile || profile.status !== "active" || suspending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-ink">
        <LoaderCircle className="w-6 h-6 animate-spin text-moss" aria-hidden="true" />
      </div>
    );
  }

  return <>{children}</>;
}
