import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/spmb";

type AuthValue = {
  user: User | null;
  session: Session | null;
  roles: string[];
  isStaff: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  roles: [],
  isStaff: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setRoles([]);
      return;
    }
    let active = true;
    db.from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .then(({ data }: { data: { role: string }[] | null }) => {
        if (active) setRoles((data ?? []).map((r) => r.role));
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      session,
      roles,
      isStaff: roles.includes("operator") || roles.includes("admin"),
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
      },
    }),
    [session, roles, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
