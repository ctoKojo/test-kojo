// Kojobot — Settings (account + branches read-only view)
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Mail, Shield, LogOut } from "lucide-react";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { KojoButton } from "@/components/ui/kojo/kojo-button";
import { useAuth } from "@/lib/auth/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listBranchesForFilter } from "@/lib/api/students";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, roles, activeBranchId, branchIds, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: allBranches, isLoading: branchesLoading } = useQuery({
    queryKey: ["settings", "branches"],
    queryFn: listBranchesForFilter,
    staleTime: 5 * 60_000,
  });

  const myBranches =
    allBranches?.filter((b) =>
      roles.includes("super_admin") ? true : branchIds.includes(b.id),
    ) ?? [];

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-title text-2xl text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Account and branch information.
        </p>
      </div>

      {/* Account */}
      <KojoCard>
        <h2 className="font-main text-lg font-semibold text-foreground mb-4">
          Account
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Mail
              className="size-4 text-muted-foreground mt-0.5 shrink-0"
              strokeWidth={1.5}
            />
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </dt>
              <dd className="text-foreground mt-0.5">
                {user?.email ?? "—"}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield
              className="size-4 text-muted-foreground mt-0.5 shrink-0"
              strokeWidth={1.5}
            />
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Roles
              </dt>
              <dd className="text-foreground mt-1 flex flex-wrap gap-1.5">
                {roles.length === 0 ? (
                  <span className="text-muted-foreground">No roles assigned</span>
                ) : (
                  roles.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-kojo-cyan/30 bg-kojo-cyan/10 px-2.5 py-0.5 text-xs font-medium text-kojo-cyan capitalize"
                    >
                      {r.replace(/_/g, " ")}
                    </span>
                  ))
                )}
              </dd>
            </div>
          </div>
        </dl>
      </KojoCard>

      {/* Branches */}
      <KojoCard>
        <h2 className="font-main text-lg font-semibold text-foreground mb-4">
          Branches
        </h2>
        {branchesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : myBranches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No branches assigned to your account.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {myBranches.map((b) => {
              const isActive = b.id === activeBranchId;
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-kojo-violet/10 text-kojo-violet">
                      <Building2 className="size-4" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {b.name}
                      </p>
                      {roles.includes("super_admin") && !activeBranchId && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Visible to super admins
                        </p>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                      Active
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </KojoCard>

      {/* Sign out */}
      <KojoCard>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-main text-base font-semibold text-foreground">
              Sign out
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              End your session on this device.
            </p>
          </div>
          <KojoButton variant="danger" onClick={handleSignOut}>
            <LogOut className="size-4" strokeWidth={1.5} />
            Sign out
          </KojoButton>
        </div>
      </KojoCard>
    </div>
  );
}
