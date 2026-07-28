"use client";

// Auth context — wraps Supabase email-OTP auth + the /api/me role lookup.
// In demo mode (no Supabase env vars) it resolves immediately to
// { live:false, role:'anon', user:null } so every consumer can render
// a sensible fallback without special-casing.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export type Role = "admin" | "staff" | "customer" | "anon";

export interface AuthState {
  loading: boolean;
  live: boolean;
  user: { email: string } | null;
  role: Role;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  loading: true,
  live: false,
  user: null,
  role: "anon",
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabaseRef = useRef<ReturnType<typeof getSupabaseBrowser>>();
  if (supabaseRef.current === undefined) supabaseRef.current = getSupabaseBrowser();
  const supabase = supabaseRef.current;

  const [loading, setLoading] = useState<boolean>(!!supabase);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [role, setRole] = useState<Role>("anon");

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    async function applySession(session: { access_token: string; user?: { email?: string | null } } | null) {
      if (!session) {
        if (!cancelled) {
          setUser(null);
          setRole("anon");
          setLoading(false);
        }
        return;
      }
      const sessionEmail = session.user?.email ?? "";
      try {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const me = await res.json();
        if (cancelled) return;
        setUser({ email: (me.email as string) || sessionEmail });
        setRole(
          me.role === "admin" || me.role === "staff" || me.role === "customer"
            ? me.role
            : "customer"
        );
      } catch {
        if (cancelled) return;
        // /api/me unreachable — treat the signed-in user as a customer.
        setUser({ email: sessionEmail });
        setRole("customer");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      live: !!supabase,
      user,
      role,
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
      },
    }),
    [loading, supabase, user, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
