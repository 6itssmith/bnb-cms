"use client";

import RequireAuth from "@/components/RequireAuth";
import { useStaffProfile } from "@/lib/StaffProfileContext";
import Sidebar from "@/components/Sidebar";
import MobileNavigation from "@/components/MobileNavigation";
import TopBar from "@/components/TopBar";

function DashboardShell({ children }: { children: React.ReactNode }) {
  // RequireAuth only renders this once profile is confirmed active, so
  // these are safe to use non-null here.
  const { profile } = useStaffProfile();

  return (
    <div className="min-h-screen bg-cream dark:bg-ink">
      <Sidebar role={profile!.role} />
      <MobileNavigation role={profile!.role} />
      <div className="md:pl-60">
        <TopBar profile={profile!} />
        <main
          className="p-5 md:p-8"
          data-aos="fade-up"
          data-aos-duration="650"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
    </RequireAuth>
  );
}
