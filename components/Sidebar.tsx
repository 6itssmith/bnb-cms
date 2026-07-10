"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Home,
  ClipboardList,
  Star,
  BarChart3,
  Settings,
  Leaf,
} from "lucide-react";
import type { StaffRole } from "@/lib/types";

export const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard, roles: ["super_admin", "manager", "staff"] },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, roles: ["super_admin", "manager"] },
  { href: "/bookings", label: "Bookings", icon: BookOpen, roles: ["super_admin", "manager", "staff"] },
  { href: "/housekeeping", label: "Housekeeping", icon: ClipboardList, roles: ["super_admin", "manager", "staff"] },
  { href: "/property", label: "Property Content", icon: Home, roles: ["super_admin", "manager"] },
  { href: "/reviews", label: "Reviews", icon: Star, roles: ["super_admin", "manager", "staff"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["super_admin", "manager"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["super_admin"] },
] as const;

export default function Sidebar({ role }: { role: StaffRole }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-ink border-r border-earth/10 dark:border-cream/10">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-earth/10 dark:border-cream/10">
        <Leaf className="w-5 h-5 text-moss" aria-hidden="true" />
        <span className="font-heading text-xl text-earth-dark dark:text-cream">Aura Crib CMS</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.filter((item) => (item.roles as readonly string[]).includes(role)).map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-moss text-cream"
                  : "text-ink/70 dark:text-cream/70 hover:bg-earth/5 dark:hover:bg-cream/10"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
