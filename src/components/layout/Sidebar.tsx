// Kojobot — Sidebar
// Dark theme (--kojo-bg-darker) with nav items per /DESIGN_SYSTEM.md §5.5.
// Placeholder logo until brand assets are uploaded.

import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Layers,
  Video,
  Wallet,
  BarChart2,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Students", to: "/students", icon: Users, disabled: true },
  { label: "Groups", to: "/groups", icon: Layers, disabled: true },
  { label: "Sessions", to: "/sessions", icon: Video, disabled: true },
  { label: "Finance", to: "/finance", icon: Wallet, disabled: true },
  { label: "Reports", to: "/reports", icon: BarChart2, disabled: true },
  { label: "Settings", to: "/settings", icon: Settings, disabled: true },
];

export function Sidebar() {
  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });

  return (
    <aside className="hidden md:flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex size-9 items-center justify-center rounded-md bg-kojo-gradient shadow-kojo-gradient">
          <span className="font-title text-base font-bold text-white">K</span>
        </div>
        <span className="font-title text-lg font-bold text-sidebar-foreground tracking-wide">
          Kojobot
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath.startsWith(item.to);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.to}
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/40"
                title="Coming soon"
              >
                <Icon className="size-5" strokeWidth={1.5} />
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-kojo-cyan/10 text-kojo-cyan border-l-[3px] border-kojo-cyan -ml-[3px] pl-[15px]"
                  : "text-sidebar-foreground hover:bg-kojo-cyan/10 hover:text-kojo-cyan",
              )}
            >
              <Icon className="size-5" strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4 text-center">
        <p className="text-xs text-sidebar-foreground/40">
          Kojobot Academy v1.0
        </p>
      </div>
    </aside>
  );
}
