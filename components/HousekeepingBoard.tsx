"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, LoaderCircle, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { HousekeepingStatus, HousekeepingTask, StaffProfile } from "@/lib/types";

const COLUMNS: { key: HousekeepingStatus; label: string }[] = [
  { key: "suggested", label: "Suggested" },
  { key: "assigned", label: "Assigned" },
  { key: "done", label: "Done" },
];

export default function HousekeepingBoard({
  tasks,
  staff,
  currentStaffId,
  canManage,
}: {
  tasks: HousekeepingTask[];
  staff: StaffProfile[];
  currentStaffId: string;
  canManage: boolean;
}) {
  const [list, setList] = useState(tasks);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");

  function canEdit(task: HousekeepingTask) {
    return canManage || task.assigned_to === currentStaffId;
  }

async function updateTask(id: string, patch: Partial<HousekeepingTask>) {
    setBusyId(id);
    const supabase = createClient();
    // 🔑 THE FIX: Cast (supabase as any) here
    const { data, error } = await (supabase as any)
      .from("housekeeping_tasks")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    setBusyId(null);
    if (!error && data) {
      setList((prev) => prev.map((t) => (t.id === id ? (data as HousekeepingTask) : t)));
    }
  }

  async function createTask() {
    if (!newTitle.trim() || !newDue) return;
    setBusyId("new");
    const supabase = createClient();
    // 🔑 THE FIX: Cast (supabase as any) here as well
    const { data, error } = await (supabase as any)
      .from("housekeeping_tasks")
      .insert({
        title: newTitle.trim(),
        due_date: newDue,
        status: "suggested",
      })
      .select()
      .single();
    setBusyId(null);
    if (!error && data) {
      setList((prev) => [...prev, data as HousekeepingTask]);
      setNewTitle("");
      setNewDue("");
      setShowNewTask(false);
    }
  }

  function staffName(id: string | null) {
    if (!id) return null;
    return staff.find((s) => s.id === id)?.full_name ?? "Unknown";
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div>
          {!showNewTask ? (
            <button onClick={() => setShowNewTask(true)} className="btn-secondary text-sm">
              <Plus className="w-4 h-4" aria-hidden="true" /> New manual task
            </button>
          ) : (
            <form onSubmit={createTask} className="card p-4 flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-ink/60 dark:text-cream/60 mb-1">Title</label>
                <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink/60 dark:text-cream/60 mb-1">Due date</label>
                <input type="date" className="input" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
              </div>
              <button type="submit" disabled={busyId === "new"} className="btn-primary text-sm">
                {busyId === "new" && <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Add
              </button>
              <button type="button" onClick={() => setShowNewTask(false)} className="btn-secondary text-sm">
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="card p-4">
            <h3 className="text-sm font-bold text-ink/70 dark:text-cream/70 mb-3 flex items-center justify-between">
              {col.label}
              <span className="text-xs font-normal text-ink/40">
                {list.filter((t) => t.status === col.key).length}
              </span>
            </h3>
            <div className="space-y-2">
              {list
                .filter((t) => t.status === col.key)
                .map((task) => (
                  <div key={task.id} className="rounded-lg border border-earth/10 dark:border-cream/10 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{task.title}</p>
                      {task.source === "auto" && (
                        <span className="badge bg-lagoon/15 text-lagoon-dark shrink-0">auto</span>
                      )}
                    </div>
                    {task.due_date && (
                      <p className="text-xs text-ink/50 dark:text-cream/50">
                        Due {format(new Date(`${task.due_date}T00:00:00`), "d MMM")}
                      </p>
                    )}
                    {task.assigned_to && (
                      <p className="text-xs text-ink/50 dark:text-cream/50 flex items-center gap-1">
                        <User className="w-3 h-3" aria-hidden="true" /> {staffName(task.assigned_to)}
                      </p>
                    )}

                    {canEdit(task) && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {canManage && col.key === "suggested" && (
                          <select
                            className="input text-xs py-1"
                            defaultValue=""
                            disabled={busyId === task.id}
                            onChange={(e) =>
                              e.target.value &&
                              updateTask(task.id, { assigned_to: e.target.value, status: "assigned" })
                            }
                          >
                            <option value="" disabled>
                              Assign to...
                            </option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.full_name}
                              </option>
                            ))}
                          </select>
                        )}
                        {col.key === "assigned" && (
                          <button
                            onClick={() => updateTask(task.id, { status: "done" })}
                            disabled={busyId === task.id}
                            className="btn-secondary text-xs py-1"
                          >
                            Mark done
                          </button>
                        )}
                        {col.key === "done" && canManage && (
                          <button
                            onClick={() => updateTask(task.id, { status: "assigned" })}
                            disabled={busyId === task.id}
                            className="btn-secondary text-xs py-1"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              {list.filter((t) => t.status === col.key).length === 0 && (
                <p className="text-xs text-ink/40 dark:text-cream/40 py-4 text-center">Nothing here</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
