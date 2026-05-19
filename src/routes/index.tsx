import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // TODO Chunk 1: check supabase session and redirect to /dashboard if signed in
    throw redirect({ to: "/login" });
  },
});
