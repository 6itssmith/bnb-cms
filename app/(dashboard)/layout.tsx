import { redirect } from "next/navigation";
import { getStaffProfile } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // middleware.ts already redirects unauthenticated/pending/suspended users
  // before this ever renders — this fetch is for the profile's *content*
  // (name, role) to drive the sidebar/topbar, and is a defensive backstop
  // in case middleware's matcher is ever narrowed.
  const profile = await getStaffProfile();
  if (!profile || profile.status !== "active") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-ink">
      <Sidebar role={profile.role} />
      <div className="md:pl-60">
        <TopBar profile={profile} />
        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
