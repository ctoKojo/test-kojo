// Kojobot — Group details route
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  useGroupProfile,
  useGroupRoster,
  useGroupSessions,
} from "@/hooks/queries/useGroupDetails";
import { GroupHeader } from "@/components/features/groups/details/GroupHeader";
import { RosterTab } from "@/components/features/groups/details/RosterTab";
import { SessionsTab } from "@/components/features/groups/details/SessionsTab";

export const Route = createFileRoute("/_authenticated/groups/$groupId")({
  component: GroupDetailsPage,
});

type TabKey = "roster" | "sessions";

function GroupDetailsPage() {
  const { groupId } = Route.useParams();
  const { hasRole } = useAuth();
  const showBranch = hasRole("super_admin");
  const [tab, setTab] = useState<TabKey>("roster");

  const profileQ = useGroupProfile(groupId);
  const rosterQ = useGroupRoster(groupId, tab === "roster");
  const sessionsQ = useGroupSessions(groupId, tab === "sessions");

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/groups" className="text-muted-foreground">
          <ArrowLeft className="mr-2 size-4" strokeWidth={1.5} />
          Back to groups
        </Link>
      </Button>

      {profileQ.isLoading ? (
        <KojoCard>
          <div className="flex items-center gap-6">
            <Skeleton className="size-20 rounded-xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </KojoCard>
      ) : profileQ.isError || !profileQ.data ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Couldn't load group</AlertTitle>
          <AlertDescription>
            {profileQ.error instanceof Error
              ? profileQ.error.message
              : "Group not found or you don't have permission to view it."}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <GroupHeader group={profileQ.data} showBranch={showBranch} />

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="bg-card">
              <TabsTrigger value="roster">Roster</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
            </TabsList>

            <TabsContent value="roster" className="mt-6">
              <RosterTab
                rows={rosterQ.data}
                isLoading={rosterQ.isLoading || rosterQ.isFetching}
              />
            </TabsContent>

            <TabsContent value="sessions" className="mt-6">
              <SessionsTab
                rows={sessionsQ.data}
                isLoading={sessionsQ.isLoading || sessionsQ.isFetching}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
