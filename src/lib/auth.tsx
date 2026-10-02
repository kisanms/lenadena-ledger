import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearLock } from "./lock";

type AuthCtx = { session: Session | null; ready: boolean; signOut: () => Promise<void> };
const Ctx = createContext<AuthCtx>({ session: null, ready: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    clearLock();
    await supabase.auth.signOut();
  };

  return <Ctx.Provider value={{ session, ready, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
