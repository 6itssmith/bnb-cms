"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { StaffProfile } from "@/lib/types";

type StaffProfileContextValue = {
  session: Session | null;
  profile: StaffProfile | null;
  /** True until the initial session + profile check has resolved. */
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const StaffProfileContext = createContext<StaffProfileContextValue | null>(null);

/**
 * Static-export replacement for the old middleware.ts + server
 * getStaffProfile() pattern. There's no server here to check auth before a
 * page renders, so this runs client-side, as early as possible (mounted
 * once at the root layout): it resolves the Supabase session, loads the
 * matching staff_profiles row, and keeps both in sync with
 * onAuthStateChange (covers sign-in, sign-out, and token refresh from any
 * tab).
 *
 * This context only drives UI (what renders, what redirects happen) —
 * exactly like middleware.ts was UX-only before. The actual access control
 * is still Row Level Security (see supabase/migrations/002_cms.sql in the
 * guest site repo); nothing here should be treated as a security boundary
 * on its own.
 */
export function StaffProfileProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase.from("staff_profiles").select("*").eq("id", userId).maybeSingle();
    
    // 🔑 THE FIX: Cast data as any to let the null fallback resolve natively
    setProfile((data as any) ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user?.id);
  }, [loadProfile, session?.user?.id]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      if (!active) return;
      setSession(initial);
      await loadProfile(initial?.user?.id);
      if (active) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      await loadProfile(newSession?.user?.id);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StaffProfileContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </StaffProfileContext.Provider>
  );
}

export function useStaffProfile() {
  const ctx = useContext(StaffProfileContext);
  if (!ctx) throw new Error("useStaffProfile must be used within a StaffProfileProvider");
  return ctx;
}
