"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, Menu, X } from "lucide-react";
import { NAV } from "@/components/Sidebar";
import type { StaffRole } from "@/lib/types";

export default function MobileNavigation({ role }: { role: StaffRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((item) => (item.roles as readonly string[]).includes(role));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-earth/5 dark:text-cream dark:hover:bg-cream/10"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="mobile-navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            type="button"
            className="absolute inset-0 w-full cursor-default bg-ink/45"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <aside
            id="mobile-navigation"
            className="relative flex h-full w-[min(18rem,85vw)] flex-col bg-white shadow-2xl dark:bg-ink"
            data-aos="fade-right"
            data-aos-duration="250"
          >
            <div className="flex h-16 items-center justify-between border-b border-earth/10 px-5 dark:border-cream/10">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-moss" aria-hidden="true" />
                <span className="font-heading text-xl text-earth-dark dark:text-cream">Aura Crib CMS</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-2" aria-label="Close navigation">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
                      active ? "bg-moss text-cream" : "text-ink/70 hover:bg-earth/5 dark:text-cream/70 dark:hover:bg-cream/10"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
