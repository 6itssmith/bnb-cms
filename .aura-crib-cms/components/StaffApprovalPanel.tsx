"use client";

import { useState } from "react";
import { format } from "date-fns";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { StaffProfile, StaffRole } from "@/lib/types";

const ROLE_OPTIONS: StaffRole[] = ["staff", "manager", "super_admin"];

export default function StaffApprovalPanel({
  staff,
  currentStaffId,
}: {
  staff: StaffProfile[];
  currentStaffId: string;
}) {
  const [list, setList] = useState(staff);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function logAction(action: string, targetId: string, details: Record<string, unknown>) {
    const supabase = createClient();
    await supabase.from("staff_audit_log").insert({
      actor_id: currentStaffId,
      action,
      target_table: "staff_profiles",
      target_id: targetId,
      details,
    });
  }

  async function approve(member: StaffProfile, role: StaffRole) {
    setBusyId(member.id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("staff_profiles")
      .update({ status: "active", role })
      .eq("id", member.id)
      .select()
      .single();
    setBusyId(null);
    if (!error && data) {
      setList((prev) => prev.map((s) => (s.id === member.id ? (data as StaffProfile) : s)));
      await logAction("staff.approved", member.id, { role });
    }
  }

  async function setRole(member: StaffProfile, role: StaffRole) {
    setBusyId(member.id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("staff_profiles")
      .update({ role })
      .eq("id", member.id)
      .select()
      .single();
    setBusyId(null);
    if (!error && data) {
      setList((prev) => prev.map((s) => (s.id === member.id ? (data as StaffProfile) : s)));
      await logAction("staff.role_changed", member.id, { role });
    }
  }

  async function setStatus(member: StaffProfile, status: "active" | "suspended") {
    setBusyId(member.id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("staff_profiles")
      .update({ status })
      .eq("id", member.id)
      .select()
      .single();
    setBusyId(null);
    if (!error && data) {
      setList((prev) => prev.map((s) => (s.id === member.id ? (data as StaffProfile) : s)));
      await logAction(status === "suspended" ? "staff.suspended" : "staff.reactivated", member.id, {});
    }
  }

  const pending = list.filter((s) => s.status === "pending");
  const others = list.filter((s) => s.status !== "pending");

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-bold text-gold">Pending approval ({pending.length})</h3>
          {pending.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-earth/10 dark:border-cream/10 last:border-0 pb-3 last:pb-0">
              <div>
                <p className="font-semibold text-sm">{member.full_name}</p>
                <p className="text-xs text-ink/50 dark:text-cream/50">
                  {member.email} · requested {format(new Date(member.created_at), "d MMM yyyy")}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <select
                  className="input text-xs py-1.5"
                  defaultValue="staff"
                  id={`role-${member.id}`}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <button
                  disabled={busyId === member.id}
                  onClick={() => {
                    const select = document.getElementById(`role-${member.id}`) as HTMLSelectElement;
                    approve(member, select.value as StaffRole);
                  }}
                  className="btn-primary text-xs"
                >
                  {busyId === member.id && <LoaderCircle className="w-3 h-3 animate-spin" aria-hidden="true" />}
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-bold text-ink/50 dark:text-cream/50 border-b border-earth/10 dark:border-cream/10">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {others.map((member) => (
              <tr key={member.id} className="border-b border-earth/5 dark:border-cream/5 last:border-0">
                <td className="px-4 py-3 font-semibold">{member.full_name}</td>
                <td className="px-4 py-3">{member.email}</td>
                <td className="px-4 py-3">
                  <select
                    className="input text-xs py-1"
                    value={member.role}
                    disabled={member.id === currentStaffId || busyId === member.id}
                    onChange={(e) => setRole(member, e.target.value as StaffRole)}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 capitalize">{member.status}</td>
                <td className="px-4 py-3 text-right">
                  {member.id !== currentStaffId && (
                    <button
                      onClick={() => setStatus(member, member.status === "suspended" ? "active" : "suspended")}
                      disabled={busyId === member.id}
                      className="btn-secondary text-xs"
                    >
                      {member.status === "suspended" ? "Reactivate" : "Suspend"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
