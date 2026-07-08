import { Clock } from "lucide-react";
import { getStaffProfile } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function PendingApprovalPage() {
  const profile = await getStaffProfile();

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-cream">
      <div className="card p-8 max-w-sm text-center">
        <Clock className="w-8 h-8 text-gold mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-lg font-bold text-earth-dark mb-2">Waiting for approval</h1>
        <p className="text-sm text-ink/70 mb-6">
          {profile
            ? `Hi ${profile.full_name.split(" ")[0]}, your account is created but a Super Admin still needs to approve it and assign your role before you can sign in.`
            : "Your account is pending approval from a Super Admin."}
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
