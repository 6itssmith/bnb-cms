"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      // Custom SMTP providers (e.g. Brevo) that reject or fail to send the
      // confirmation email can make Supabase return an error whose
      // `.message` is empty or missing — that's what shows up as a bare
      // "{}" instead of a real message. Logging the raw object is the only
      // way to see what actually happened in that case; the checklist in
      // CLOUDFLARE_DEPLOY.md ("Signup shows a blank / {} error") walks
      // through the likely SMTP misconfiguration.
      console.error("Sign up error:", signUpError);
      setError(
        signUpError.message && signUpError.message.trim().length > 0
          ? signUpError.message
          : "Sign up failed while sending the confirmation email. This usually means the SMTP provider (e.g. Brevo) rejected it — check the sender address is verified, or disable email confirmation in Supabase Auth settings while testing. See browser console for details."
      );
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      // Email confirmation is likely required before a session exists.
      setLoading(false);
      router.push("/pending-approval");
      return;
    }

    // RLS policy "a user can create their own pending profile at signup"
    // only allows status='pending', role='staff' regardless of what's sent
    // here — that enforcement is server-side, not just this form.
//  THE FIX: Add (as any) before the insert object literal
const { error: profileError } = await supabase.from("staff_profiles").insert({
  id: userId,
  full_name: fullName,
  email,
  role: "staff",
  status: "pending"
} as any);

    if (profileError) {
      console.error("Profile insert error:", profileError);
      setError(
        profileError.message && profileError.message.trim().length > 0
          ? profileError.message
          : "Account created, but couldn't save your profile. Check the browser console for details, or contact a Super Admin."
      );
      setLoading(false);
      return;
    }

    router.push("/pending-approval");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-cream">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Leaf className="w-6 h-6 text-moss" aria-hidden="true" />
          <span className="font-bold text-xl text-earth-dark">Aura Crib CMS</span>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-bold text-earth-dark mb-1">Request staff access</h1>
          <p className="text-sm text-ink/60 mb-5">
            A Super Admin will review and approve your account before you can sign in.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold text-ink/70 mb-1">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                required
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-ink/70 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-ink/70 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Request access
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink/60 mt-5">
          Already approved?{" "}
          <Link href="/login" className="font-bold text-lagoon hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
