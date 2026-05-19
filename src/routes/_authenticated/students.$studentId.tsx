// Kojobot — Student details (placeholder for Phase 2.2)
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Construction } from "lucide-react";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  component: StudentDetailsPage,
});

function StudentDetailsPage() {
  const { studentId } = Route.useParams();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/students" className="text-muted-foreground">
          <ArrowLeft className="mr-2 size-4" strokeWidth={1.5} />
          Back to students
        </Link>
      </Button>

      <KojoCard>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Construction
            className="size-10 text-kojo-cyan"
            strokeWidth={1.25}
          />
          <h3 className="mt-3 font-main text-lg font-semibold text-foreground">
            Student details — coming in Phase 2.2
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Profile, enrollments, attendance, payments, and progression.
          </p>
          <code className="mt-4 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            id: {studentId}
          </code>
        </div>
      </KojoCard>
    </div>
  );
}
