// Kojobot — Dashboard Shell
// Sidebar + Topbar + content area per /DESIGN_SYSTEM.md §9.
// Dashboard is always dark mode (per §11).

import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardShell() {
  // Dark theme applied globally on <html> in __root.tsx (spec §11).

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
