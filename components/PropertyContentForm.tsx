"use client";

import { useState } from "react";
import { Plus, Trash2, LoaderCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PropertyContent } from "@/lib/types";

type Gallery = { url: string; alt: string };
type Amenity = { icon: string; label: string };

const EMPTY: Omit<PropertyContent, "id" | "updated_by" | "updated_at"> = {
  name: "",
  tagline: "",
  location: "",
  description: "",
  support_email: "",
  support_phone: "",
  base_price_per_night: 0,
  currency: "KES",
  gallery: [],
  amenities: [],
  policies: [],
};

export default function PropertyContentForm({ content }: { content: PropertyContent | null }) {
  const [form, setForm] = useState(content ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

 async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      ...form,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    };

    // 🔑 THE FIX: Cast (supabase as any) on both update and insert lines
    const { error: err } = content?.id
      ? await (supabase as any).from("property_content").update(payload).eq("id", content.id)
      : await (supabase as any).from("property_content").insert(payload);

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setSaved(true);
    }
  }

  const gallery = form.gallery as Gallery[];
  const amenities = form.amenities as Amenity[];
  const policies = form.policies as string[];

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-earth-dark dark:text-cream">Basics</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Property name">
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </Field>
          <Field label="Tagline">
            <input className="input" value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
          <Field label="Location">
            <input className="input" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
          </Field>
          <Field label="Base price / night">
            <div className="flex gap-2">
              <input
                type="number"
                className="input"
                value={form.base_price_per_night}
                onChange={(e) => set("base_price_per_night", Number(e.target.value))}
                required
              />
              <input
                className="input w-24"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Support email">
            <input
              type="email"
              className="input"
              value={form.support_email ?? ""}
              onChange={(e) => set("support_email", e.target.value)}
            />
          </Field>
          <Field label="Support phone">
            <input className="input" value={form.support_phone ?? ""} onChange={(e) => set("support_phone", e.target.value)} />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className="input min-h-[100px]"
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-earth-dark dark:text-cream">Gallery</h2>
          <button
            type="button"
            onClick={() => set("gallery", [...gallery, { url: "", alt: "" }])}
            className="btn-secondary text-xs"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add photo
          </button>
        </div>
        {gallery.map((g, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              className="input"
              placeholder="Image URL"
              value={g.url}
              onChange={(e) => {
                const next = [...gallery];
                next[i] = { ...next[i], url: e.target.value };
                set("gallery", next);
              }}
            />
            <input
              className="input"
              placeholder="Alt text"
              value={g.alt}
              onChange={(e) => {
                const next = [...gallery];
                next[i] = { ...next[i], alt: e.target.value };
                set("gallery", next);
              }}
            />
            <RemoveButton onClick={() => set("gallery", gallery.filter((_, idx) => idx !== i))} />
          </div>
        ))}
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-earth-dark dark:text-cream">Amenities</h2>
          <button
            type="button"
            onClick={() => set("amenities", [...amenities, { icon: "Wifi", label: "" }])}
            className="btn-secondary text-xs"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add amenity
          </button>
        </div>
        {amenities.map((a, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              className="input w-40"
              placeholder="lucide-react icon name"
              value={a.icon}
              onChange={(e) => {
                const next = [...amenities];
                next[i] = { ...next[i], icon: e.target.value };
                set("amenities", next);
              }}
            />
            <input
              className="input"
              placeholder="Label"
              value={a.label}
              onChange={(e) => {
                const next = [...amenities];
                next[i] = { ...next[i], label: e.target.value };
                set("amenities", next);
              }}
            />
            <RemoveButton onClick={() => set("amenities", amenities.filter((_, idx) => idx !== i))} />
          </div>
        ))}
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-earth-dark dark:text-cream">Policies</h2>
          <button
            type="button"
            onClick={() => set("policies", [...policies, ""])}
            className="btn-secondary text-xs"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add policy
          </button>
        </div>
        {policies.map((p, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              className="input"
              value={p}
              onChange={(e) => {
                const next = [...policies];
                next[i] = e.target.value;
                set("policies", next);
              }}
            />
            <RemoveButton onClick={() => set("policies", policies.filter((_, idx) => idx !== i))} />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving && <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {saved && !saving && <Check className="w-4 h-4" aria-hidden="true" />}
        {saved && !saving ? "Saved" : "Save changes"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-ink/60 dark:text-cream/60 mb-1">{label}</span>
      {children}
    </label>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="p-2 text-ink/40 hover:text-red-600" aria-label="Remove">
      <Trash2 className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}
