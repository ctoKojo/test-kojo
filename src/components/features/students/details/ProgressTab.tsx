// Kojobot — Progress tab
// Current-level progress (weighted score, classwork vs exam) + assignment grades
// + final exam results + level progression log (promoted/retained history).

import { format } from "date-fns";
import { ArrowRight, GraduationCap, History } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KojoBadge } from "@/components/ui/kojo/kojo-badge";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  StudentProfile,
  StudentProgressResult,
} from "@/lib/api/student-details";

interface Props {
  student: StudentProfile;
  data: StudentProgressResult | undefined;
  isLoading: boolean;
}

function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

function pct(n: number | null) {
  return n == null ? "—" : `${n.toFixed(1)}%`;
}

function statusTone(s: "passing" | "on_track" | "at_risk" | "no_data") {
  switch (s) {
    case "passing":
      return { color: "text-success", variant: "success" as const, label: "Passing" };
    case "on_track":
      return { color: "text-warning", variant: "warning" as const, label: "On track" };
    case "at_risk":
      return { color: "text-destructive", variant: "danger" as const, label: "At risk" };
    default:
      return { color: "text-muted-foreground", variant: "neutral" as const, label: "No data" };
  }
}

function progressionVariant(
  t: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (t) {
    case "promoted":
      return "success";
    case "retained":
      return "warning";
    case "dropped":
      return "danger";
    case "reinstated":
      return "info";
    default:
      return "neutral";
  }
}

export function ProgressTab({ student, data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }
  if (!data) return null;

  const { assignments, exams, progressionLog, currentLevel } = data;

  return (
    <div className="space-y-6">
      {/* Current level progress */}
      <KojoCard variant="gradient">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">
              Current level
            </div>
            <div className="mt-1 font-title text-2xl">
              {student.current_level?.name ?? "No active level"}
            </div>
          </div>
          {currentLevel ? (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider opacity-80">
                Weighted score
              </div>
              <div className="font-title text-3xl">
                {pct(currentLevel.weightedScore)}
              </div>
              <div className="mt-1 text-xs opacity-80">
                Passing ≥ {currentLevel.passingScore}%
              </div>
            </div>
          ) : null}
        </div>

        {currentLevel ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Bar
              label={`Classwork (${currentLevel.classworkWeight}%)`}
              value={currentLevel.classworkAvg}
            />
            <Bar
              label={`Final exam (${currentLevel.examWeight}%)`}
              value={currentLevel.examScore}
            />
            <div className="flex flex-col justify-end">
              <span className="text-xs uppercase tracking-wider opacity-80">
                Status
              </span>
              <KojoBadge
                variant={statusTone(currentLevel.status).variant}
                className="mt-1 w-fit"
              >
                {statusTone(currentLevel.status).label}
              </KojoBadge>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm opacity-80">
            Student isn't enrolled in an active level.
          </p>
        )}
      </KojoCard>

      {/* Final exams */}
      <section>
        <SectionHead icon={<GraduationCap className="size-4" strokeWidth={1.5} />}>
          Final exams
        </SectionHead>
        {exams.length === 0 ? (
          <EmptyHint>No final exam results yet.</EmptyHint>
        ) : (
          <KojoCard className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((e) => {
                  const max = e.exam?.max_score ?? 100;
                  const scorePct =
                    e.score != null && max > 0
                      ? ((Number(e.score) / max) * 100).toFixed(1) + "%"
                      : "—";
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-foreground">
                        {e.exam?.title ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {e.exam?.group?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmt(e.exam?.exam_date ?? null)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {e.score != null
                          ? `${e.score} / ${max} · ${scorePct}`
                          : "Not graded"}
                      </TableCell>
                      <TableCell>
                        {e.passed === true ? (
                          <KojoBadge variant="success">passed</KojoBadge>
                        ) : e.passed === false ? (
                          <KojoBadge variant="danger">
                            failed{e.failure_reason_type ? ` · ${e.failure_reason_type}` : ""}
                          </KojoBadge>
                        ) : (
                          <KojoBadge variant="neutral">pending</KojoBadge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </KojoCard>
        )}
      </section>

      {/* Assignment grades */}
      <section>
        <SectionHead icon={<History className="size-4" strokeWidth={1.5} />}>
          Recent assignment grades
        </SectionHead>
        {assignments.length === 0 ? (
          <EmptyHint>No assignment submissions yet.</EmptyHint>
        ) : (
          <KojoCard className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => {
                  const max = a.assignment?.max_score ?? 100;
                  const scorePct =
                    a.score != null && max > 0
                      ? ((Number(a.score) / max) * 100).toFixed(0) + "%"
                      : null;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="truncate">
                            {a.assignment?.title ?? "—"}
                          </span>
                          {a.assignment?.is_compensation ? (
                            <KojoBadge variant="warning">comp</KojoBadge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.assignment?.group?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmt(a.submitted_at)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {a.score != null
                          ? `${a.score} / ${max}${scorePct ? ` · ${scorePct}` : ""}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <KojoBadge
                          variant={
                            a.status === "graded"
                              ? "success"
                              : a.status === "submitted"
                                ? "info"
                                : a.status === "late"
                                  ? "warning"
                                  : "neutral"
                          }
                        >
                          {a.status}
                        </KojoBadge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </KojoCard>
        )}
      </section>

      {/* Progression log */}
      <section>
        <SectionHead icon={<ArrowRight className="size-4" strokeWidth={1.5} />}>
          Level progression history
        </SectionHead>
        {progressionLog.length === 0 ? (
          <EmptyHint>No progression decisions recorded.</EmptyHint>
        ) : (
          <KojoCard className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progressionLog.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">
                      {fmt(p.decided_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.academic_term?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {p.from_level?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {p.to_level?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <KojoBadge variant={progressionVariant(p.progression_type)}>
                        {p.progression_type}
                        {p.failure_reason_type ? ` · ${p.failure_reason_type}` : ""}
                      </KojoBadge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {p.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </KojoCard>
        )}
      </section>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number | null }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="opacity-80">{label}</span>
        <span className="font-medium">{pct(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function SectionHead({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h3 className="mb-3 flex items-center gap-2 font-main text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="text-kojo-cyan">{icon}</span>
      {children}
    </h3>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <KojoCard>
      <p className="py-8 text-center text-sm text-muted-foreground">
        {children}
      </p>
    </KojoCard>
  );
}
