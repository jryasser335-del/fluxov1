import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Loader2 } from "lucide-react";

/**
 * Gate that requires a valid app-user session.
 * - Always re-validates the session server-side on mount (and again every 5 min)
 *   so an attacker cannot grant themselves access by editing localStorage.
 */
export function AppAuthGuard({ children }: { children: ReactNode }) {
  const { appUser, hasHydrated, verifyAccess } = useAppAuth();
  const [verified, setVerified] = useState<null | boolean>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    let active = true;
    (async () => {
      const ok = await verifyAccess();
      if (active) setVerified(ok);
    })();
    const id = setInterval(() => {
      verifyAccess().then((ok) => active && setVerified(ok));
    }, 5 * 60 * 1000);
    return () => { active = false; clearInterval(id); };
  }, [hasHydrated, verifyAccess]);

  if (!hasHydrated || verified === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!appUser || !verified) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
