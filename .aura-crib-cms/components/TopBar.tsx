import SignOutButton from "@/components/SignOutButton";
import type { StaffProfile } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  staff: "Staff",
};

export default function TopBar({ profile }: { profile: StaffProfile }) {
  return (
    <header className="h-16 border-b border-earth/10 dark:border-cream/10 bg-white dark:bg-ink flex items-center justify-between px-5 md:px-8">
      <div>
        <p className="text-sm font-bold text-ink dark:text-cream">{profile.full_name}</p>
        <p className="text-xs text-ink/50 dark:text-cream/50">{ROLE_LABEL[profile.role]}</p>
      </div>
      <SignOutButton className="btn-secondary text-xs px-4 py-2" />
    </header>
  );
}
