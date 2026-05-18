import { createFileRoute, Outlet } from "@tanstack/react-router";

// Kojo Academy — Authenticated layout route.
// Responsibilities (to be implemented after Phase 0 Chunk 1):
//   1. beforeLoad: verify supabase session, else redirect to /login.
//   2. Load user_roles + active branch into router context.
//   3. Role-based smart redirect on first hit:
//        super_admin/branch_admin -> /dashboard
//        reception                -> /reception
//        trainer                  -> /trainer
//        sales                    -> /sales
//        moderator                -> /moderator
//        student                  -> /student
//        parent                   -> /parent
//   4. Provide <AuthContext> consumed by useAuth().
// TODO: implement after Phase 0 Chunk 1.

export const Route = createFileRoute("/_authenticated")({
  component: () => <Outlet />,
});
