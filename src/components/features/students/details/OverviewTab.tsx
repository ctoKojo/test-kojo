// Kojobot — Overview tab (profile + parents)
import { Mail, Phone, School, StickyNote, Star, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KojoBadge } from "@/components/ui/kojo/kojo-badge";
import { KojoCard } from "@/components/ui/kojo/kojo-card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  StudentParent,
  StudentProfile,
} from "@/lib/api/student-details";

interface Props {
  student: StudentProfile;
  parents: StudentParent[] | undefined;
  parentsLoading: boolean;
}

export function OverviewTab({ student, parents, parentsLoading }: Props) {
  const p = student.profile;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <KojoCard>
        <SectionTitle>Contact</SectionTitle>
        <dl className="space-y-3 text-sm">
          <Row icon={<Mail className="size-4" strokeWidth={1.5} />} label="Email">
            {p?.email ?? <Muted>—</Muted>}
          </Row>
          <Row icon={<Phone className="size-4" strokeWidth={1.5} />} label="Phone">
            {p?.phone ?? <Muted>—</Muted>}
          </Row>
          <Row icon={<School className="size-4" strokeWidth={1.5} />} label="School">
            {student.school ?? <Muted>—</Muted>}
          </Row>
          <Row icon={<UserIcon className="size-4" strokeWidth={1.5} />} label="Gender">
            {student.gender ?? <Muted>—</Muted>}
          </Row>
        </dl>
        {student.notes ? (
          <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <StickyNote className="size-3.5" strokeWidth={1.5} /> Notes
            </div>
            <p className="text-sm text-foreground">{student.notes}</p>
          </div>
        ) : null}
      </KojoCard>

      <KojoCard>
        <SectionTitle>Parents / Guardians</SectionTitle>
        {parentsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !parents || parents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No parents linked.
          </p>
        ) : (
          <ul className="space-y-3">
            {parents.map((par) => {
              const name = par.profile?.full_name ?? "Unnamed";
              const initials = name
                .split(" ")
                .map((n) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <li
                  key={par.link_id}
                  className="flex items-center gap-3 rounded-md border border-border p-3"
                >
                  <Avatar className="size-10">
                    {par.profile?.avatar_url ? (
                      <AvatarImage src={par.profile.avatar_url} alt={name} />
                    ) : null}
                    <AvatarFallback className="bg-muted text-xs">
                      {initials || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {name}
                      </span>
                      {par.is_primary ? (
                        <KojoBadge variant="info" className="gap-1">
                          <Star className="size-3" strokeWidth={2} /> primary
                        </KojoBadge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {par.relation_type}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {par.profile?.phone ? (
                        <span>{par.profile.phone}</span>
                      ) : null}
                      {par.profile?.email ? (
                        <span className="truncate">{par.profile.email}</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </KojoCard>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 font-main text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-kojo-cyan">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm text-foreground">{children}</dd>
      </div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}
