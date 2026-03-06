import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Loader2 } from "lucide-react";

export function AppAuthGuard({ children }: { children: ReactNode }) {
  const { appUser, isLoading, checkAccess } = useAppAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!appUser || !checkAccess()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
