// Kojobot — Session details + attendance route
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  useSessionDetail,
  useSessionRoster,
} from "@/hooks/queries/useSession";
import { SessionHeader } from "@/components/features/sessions/SessionHeader";
import { AttendanceMarker } from "@/components/features/sessions/AttendanceMarker";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  component: SessionDetailsPage,
});

function SessionDetailsPage() {
  const { sessionId } = Route.useParams();
  const { hasAnyRole } = useAuth();
  const canEdit = hasAnyRole([
    "super_admin",
    "branch_admin",
    "reception",
    "trainer",
  ]);

  const detailQ = useSessionDetail(sessionId);
  const rosterQ = useSessionRoster(sessionId, detailQ.data?.group_id);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link
          to={detailQ.data?.group_id ? "/groups/$groupId" : "/groups"}
          params={
            detailQ.data?.group_id
              ? { groupId: detailQ.data.group_id }
              : undefined
          }
          className="text-muted-foreground"
        >
          <ArrowLeft className="mr-2 size-4" strokeWidth={1.5} />
          Back
        </Link>
      </Button>

      {detailQ.isLoading ? (
        <KojoCard>
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </KojoCard>
      ) : detailQ.isError || !detailQ.data ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Couldn't load session</AlertTitle>
          <AlertDescription>
            {detailQ.error instanceof Error
              ? detailQ.error.message
              : "Session not found or no permission."}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <SessionHeader session={detailQ.data} />

          <div>
            <h2 className="font-title text-lg text-foreground mb-3">
              Attendance
            </h2>
            <AttendanceMarker
              sessionId={sessionId}
              groupId={detailQ.data.group_id}
              branchId={detailQ.data.branch_id}
              roster={rosterQ.data}
              isLoading={rosterQ.isLoading || rosterQ.isFetching}
              canEdit={canEdit}
            />
          </div>
        </>
      )}
    </div>
  );
}
