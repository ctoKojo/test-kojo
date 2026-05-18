import { createFileRoute } from "@tanstack/react-router";

// Kojo Academy — Login route (public).
// Will host email/password + Google sign-in via Lovable broker.
// Role-based redirect happens in _authenticated/route.tsx after auth.
// TODO: implement after Phase 0 Chunk 1 (user_roles ready) + Chunk 2 (staff_employees).

export const Route = createFileRoute("/login")({
  component: LoginPlaceholder,
});

function LoginPlaceholder() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Login page — pending Phase 0 Chunk 1.
      </p>
    </div>
  );
}
