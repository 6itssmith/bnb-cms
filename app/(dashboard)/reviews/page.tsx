"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStaffProfile } from "@/lib/StaffProfileContext";
import { canManage } from "@/lib/auth";
import ReviewsModeration from "@/components/ReviewsModeration";
import { PageLoading } from "@/components/PageStates";
import type { Review } from "@/lib/types";

export default function ReviewsPage() {
  const { profile } = useStaffProfile();
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    document.title = "Reviews | Aura Crib CMS";
    const supabase = createClient();
    supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews((data as Review[]) ?? []));
  }, []);

  if (reviews === null) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-earth-dark dark:text-cream">Reviews</h1>
        <p className="text-sm text-ink/60 dark:text-cream/60">
          Approve or hide submitted reviews — approved ones are what the guest site's Testimonials
          section shows. Anyone can reply; only managers approve or hide.
        </p>
      </div>

      <ReviewsModeration reviews={reviews} canModerate={canManage(profile)} />
    </div>
  );
}
