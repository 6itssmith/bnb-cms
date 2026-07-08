import { format } from "date-fns";
import type { AuditLogEntry, StaffProfile } from "@/lib/types";

export default function AuditLogTable({
  entries,
  staff,
}: {
  entries: AuditLogEntry[];
  staff: StaffProfile[];
}) {
  function actorName(id: string | null) {
    if (!id) return "System";
    return staff.find((s) => s.id === id)?.full_name ?? "Unknown";
  }

  if (entries.length === 0) {
    return <p className="text-sm text-ink/50 dark:text-cream/50">No actions logged yet.</p>;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-bold text-ink/50 dark:text-cream/50 border-b border-earth/10 dark:border-cream/10">
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Actor</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">Target</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-earth/5 dark:border-cream/5 last:border-0">
              <td className="px-4 py-3 text-xs text-ink/60 dark:text-cream/60">
                {format(new Date(e.created_at), "d MMM yyyy, HH:mm")}
              </td>
              <td className="px-4 py-3 font-semibold">{actorName(e.actor_id)}</td>
              <td className="px-4 py-3">
                <span className="badge bg-earth/10 text-earth-dark dark:bg-cream/10 dark:text-cream">
                  {e.action}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-ink/50 dark:text-cream/50">
                {e.target_table ? `${e.target_table}:${e.target_id}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
