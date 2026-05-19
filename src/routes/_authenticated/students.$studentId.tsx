// Kojobot — Student details route (Phase 2.2)
// Lazy-loads tab data on demand to keep initial paint fast.

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
  useStudentAttendance,
  useStudentEnrollments,
  useStudentParents,
  useStudentPayments,
  useStudentProfile,
  useStudentProgress,
} from "@/hooks/queries/useStudentDetails";
import { StudentHeader } from "@/components/features/students/details/StudentHeader";
import { OverviewTab } from "@/components/features/students/details/OverviewTab";
import { EnrollmentsTab } from "@/components/features/students/details/EnrollmentsTab";
import { AttendanceTab } from "@/components/features/students/details/AttendanceTab";
import { PaymentsTab } from "@/components/features/students/details/PaymentsTab";
import { ProgressTab } from "@/components/features/students/details/ProgressTab";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  component: StudentDetailsPage,
});

type TabKey =
  | "overview"
  | "enrollments"
  | "attendance"
  | "payments"
  | "progress";

function StudentDetailsPage() {
  const { studentId } = Route.useParams();
  const { hasRole } = useAuth();
  const showBranch = hasRole("super_admin");
  const [tab, setTab] = useState<TabKey>("overview");

  const profileQ = useStudentProfile(studentId);
  const parentsQ = useStudentParents(studentId);

  // Lazy queries — only fetch when tab is visited.
  const enrollmentsQ = useStudentEnrollments(studentId, tab === "enrollments");
  const attendanceQ = useStudentAttendance(studentId, tab === "attendance");
  const paymentsQ = useStudentPayments(studentId, tab === "payments");
  const progressQ = useStudentProgress(
    studentId,
    profileQ.data,
    tab === "progress",
  );

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/students" className="text-muted-foreground">
          <ArrowLeft className="mr-2 size-4" strokeWidth={1.5} />
          Back to students
        </Link>
      </Button>

      {profileQ.isLoading ? (
        <KojoCard>
          <div className="flex items-center gap-6">
            <Skeleton className="size-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </KojoCard>
      ) : profileQ.isError || !profileQ.data ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Couldn't load student</AlertTitle>
          <AlertDescription>
            {profileQ.error instanceof Error
              ? profileQ.error.message
              : "Student not found or you don't have permission to view this profile."}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <StudentHeader student={profileQ.data} showBranch={showBranch} />

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="bg-card">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab
                student={profileQ.data}
                parents={parentsQ.data}
                parentsLoading={parentsQ.isLoading}
              />
            </TabsContent>

            <TabsContent value="progress" className="mt-6">
              <ProgressTab
                student={profileQ.data}
                data={progressQ.data}
                isLoading={progressQ.isLoading || progressQ.isFetching}
              />
            </TabsContent>

            <TabsContent value="enrollments" className="mt-6">
              <EnrollmentsTab
                rows={enrollmentsQ.data}
                isLoading={enrollmentsQ.isLoading || enrollmentsQ.isFetching}
              />
            </TabsContent>

            <TabsContent value="attendance" className="mt-6">
              <AttendanceTab
                data={attendanceQ.data}
                isLoading={attendanceQ.isLoading || attendanceQ.isFetching}
              />
            </TabsContent>

            <TabsContent value="payments" className="mt-6">
              <PaymentsTab
                data={paymentsQ.data}
                isLoading={paymentsQ.isLoading || paymentsQ.isFetching}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
