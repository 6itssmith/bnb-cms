import { createClient } from "@/lib/supabase/server";
import { getStaffProfile, canManage } from "@/lib/auth";
import { redirect } from "next/navigation";
import PropertyContentForm from "@/components/PropertyContentForm";
import type { PropertyContent } from "@/lib/types";

export const metadata = { title: "Property Content | Aura Crib CMS" };

export default async function PropertyContentPage() {
  const profile = await getStaffProfile();
  if (!canManage(profile)) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.from("property_content").select("*").limit(1).maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Property Content</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          Changes save live — the guest site fetches this content directly, no redeploy needed.
        </p>
      </div>

      <PropertyContentForm content={data as PropertyContent | null} />
    </div>
  );
}
