// Kojobot — Authenticated layout (auth guard + dashboard shell)
import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthLoadingScreen } from "@/components/shared/AuthLoadingScreen";
import { useAuth } from "@/lib/auth/useAuth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedRoute,
});

function AuthenticatedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/login", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthLoadingScreen />;
  }

  return <DashboardShell />;
}
