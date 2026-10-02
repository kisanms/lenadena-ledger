import { useEffect, useState, type ReactNode } from "react";
import { useHydrated, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { hasPin, isUnlocked } from "@/lib/lock";
import { useLedgerRealtime } from "@/lib/ledger";
import { LockScreen } from "./LockScreen";
import { Logo } from "./Logo";

const PUBLIC = ["/welcome", "/login"];
export const ONBOARD_KEY = "ld_onboarded";

function Splash() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-background">
      <div className="animate-pulse">
        <Logo />
      </div>
    </div>
  );
}

export function AppGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { session, ready } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(true);
  const [checked, setChecked] = useState(false);

  useLedgerRealtime(!!session);

  useEffect(() => {
    if (!hydrated || !ready) return;
    const onboarded = localStorage.getItem(ONBOARD_KEY) === "1";
    if (!session) {
      if (!onboarded && pathname !== "/welcome") navigate({ to: "/welcome", replace: true });
      else if (onboarded && !PUBLIC.includes(pathname)) navigate({ to: "/login", replace: true });
    } else {
      localStorage.setItem(ONBOARD_KEY, "1");
      if (PUBLIC.includes(pathname)) navigate({ to: "/", replace: true });
      setUnlocked(!hasPin() || isUnlocked());
    }
    setChecked(true);
  }, [hydrated, ready, session, pathname, navigate]);

  if (!hydrated || !ready || !checked) return <Splash />;
  const isPublic = PUBLIC.includes(pathname);
  if (!session && !isPublic) return <Splash />;
  if (session && isPublic) return <Splash />;
  if (session && !unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;
  return <>{children}</>;
}
