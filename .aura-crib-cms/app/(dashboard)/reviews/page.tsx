import { createClient } from "@/lib/supabase/server";
import { getStaffProfile, canManage } from "@/lib/auth";
import ReviewsModeration from "@/components/ReviewsModeration";
import type { Review } from "@/lib/types";

export const metadata = { title: "Reviews | Aura Crib CMS" };

export default async function ReviewsPage() {
  const supabase = await createClient();
  const profile = await getStaffProfile();

  const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Reviews</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          Approve or hide submitted reviews — approved ones are what the guest site's Testimonials
          section shows. Anyone can reply; only managers approve or hide.
        </p>
      </div>

      <ReviewsModeration reviews={(data as Review[]) ?? []} canModerate={canManage(profile)} />
    </div>
  );
}
