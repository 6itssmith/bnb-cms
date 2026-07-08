"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Star, Check, EyeOff, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Review, ReviewStatus } from "@/lib/types";

const STATUS_STYLES: Record<ReviewStatus, string> = {
  pending: "bg-gold/20 text-earth-dark",
  approved: "bg-moss/15 text-moss-dark",
  hidden: "bg-ink/10 text-ink/60 dark:bg-cream/10 dark:text-cream/60",
};

export default function ReviewsModeration({
  reviews,
  canModerate,
}: {
  reviews: Review[];
  canModerate: boolean;
}) {
  const [list, setList] = useState(reviews);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(id: string, status: ReviewStatus) {
    setBusyId(id);
    const supabase = createClient();
    const { data, error } = await supabase.from("reviews").update({ status }).eq("id", id).select().single();
    setBusyId(null);
    if (!error && data) setList((prev) => prev.map((r) => (r.id === id ? (data as Review) : r)));
  }

  async function saveReply(id: string) {
    const reply = replyDrafts[id];
    if (!reply?.trim()) return;
    setBusyId(id);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("reviews")
      .update({ reply, replied_by: user?.id })
      .eq("id", id)
      .select()
      .single();
    setBusyId(null);
    if (!error && data) setList((prev) => prev.map((r) => (r.id === id ? (data as Review) : r)));
  }

  if (list.length === 0) {
    return <p className="text-sm text-ink/50 dark:text-cream/50">No reviews submitted yet.</p>;
  }

  return (
    <div className="space-y-3">
      {list.map((review) => (
        <div key={review.id} className="card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-sm">{review.guest_name}</p>
              {review.stay_label && <p className="text-xs text-ink/50 dark:text-cream/50">{review.stay_label}</p>}
            </div>
            <div className="flex items-center gap-2">
              {review.rating && (
                <span className="flex items-center gap-0.5 text-gold">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  ))}
                </span>
              )}
              <span className={`badge ${STATUS_STYLES[review.status]}`}>{review.status}</span>
            </div>
          </div>

          <p className="text-sm text-ink/80 dark:text-cream/80">{review.quote}</p>
          <p className="text-xs text-ink/40 dark:text-cream/40">
            Submitted {format(new Date(review.created_at), "d MMM yyyy")}
          </p>

          {review.reply && (
            <div className="rounded-lg bg-earth/5 dark:bg-cream/5 p-3 text-sm">
              <p className="text-xs font-bold text-ink/50 dark:text-cream/50 mb-1">Staff reply</p>
              {review.reply}
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center pt-1">
            {canModerate && review.status !== "approved" && (
              <button onClick={() => setStatus(review.id, "approved")} disabled={busyId === review.id} className="btn-secondary text-xs">
                {busyId === review.id ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                Approve
              </button>
            )}
            {canModerate && review.status !== "hidden" && (
              <button onClick={() => setStatus(review.id, "hidden")} disabled={busyId === review.id} className="btn-secondary text-xs">
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Hide
              </button>
            )}
          </div>

          {!review.reply && (
            <div className="flex gap-2 pt-1">
              <input
                className="input text-xs"
                placeholder="Write a reply..."
                value={replyDrafts[review.id] ?? ""}
                onChange={(e) => setReplyDrafts((d) => ({ ...d, [review.id]: e.target.value }))}
              />
              <button onClick={() => saveReply(review.id)} disabled={busyId === review.id} className="btn-primary text-xs px-4">
                Reply
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
