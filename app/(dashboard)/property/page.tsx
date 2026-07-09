"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStaffProfile } from "@/lib/StaffProfileContext";
import { canManage } from "@/lib/auth";
import PropertyContentForm from "@/components/PropertyContentForm";
import { PageLoading, NotPermitted } from "@/components/PageStates";
import type { PropertyContent } from "@/lib/types";

export default function PropertyContentPage() {
  const { profile, loading: profileLoading } = useStaffProfile();
  const [content, setContent] = useState<PropertyContent | null | undefined>(undefined);

  useEffect(() => {
    document.title = "Property Content | Aura Crib CMS";
    if (profileLoading || !canManage(profile)) return;
    const supabase = createClient();
    supabase
      .from("property_content")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setContent((data as PropertyContent) ?? null));
  }, [profileLoading, profile]);

  if (profileLoading) return <PageLoading />;
  if (!canManage(profile)) return <NotPermitted />;
  if (content === undefined) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Property Content</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          Changes save live — the guest site fetches this content directly, no redeploy needed.
        </p>
      </div>

      <PropertyContentForm content={content} />
    </div>
  );
}
