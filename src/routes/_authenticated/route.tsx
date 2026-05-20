// Kojobot — Authenticated layout (auth guard + dashboard shell)
import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthLoadingScreen } from "@/components/shared/AuthLoadingScreen";
import { useAuth } from "@/lib/auth/useAuth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedRoute,
});

function AuthenticatedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    window.location.replace("/login");
    return <AuthLoadingScreen />;
  }

  return <DashboardShell />;
}
