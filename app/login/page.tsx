"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Leaf, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const suspended = params.get("suspended") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-cream">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Leaf className="w-6 h-6 text-moss" aria-hidden="true" />
          <span className="font-bold text-xl text-earth-dark">Aura Crib CMS</span>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-bold text-earth-dark mb-1">Staff sign in</h1>
          <p className="text-sm text-ink/60 mb-5">
            Access is by Super Admin approval only.
          </p>

          {suspended && (
            <p className="mb-4 text-sm rounded-lg bg-earth-dark/10 text-earth-dark px-3 py-2">
              That account has been suspended. Contact a Super Admin.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink/60 mt-5">
          New staff member?{" "}
          <Link href="/signup" className="font-bold text-lagoon hover:underline">
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
