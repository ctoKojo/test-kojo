// Kojobot — Topbar
// Page title + notifications bell + user avatar dropdown per /DESIGN_SYSTEM.md §5.5.

import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "Dashboard" }: TopbarProps) {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const initials =
    user?.email
      ?.split("@")[0]
      ?.slice(0, 2)
      ?.toUpperCase() ?? "??";

  const primaryRole = roles[0] ?? "user";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-sidebar px-6">
      <h1 className="font-main text-xl font-semibold text-foreground">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          type="button"
          className="relative flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-kojo-cyan/10 hover:text-kojo-cyan"
          aria-label="Notifications"
        >
          <Bell className="size-5" strokeWidth={1.5} />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-kojo-cyan/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-kojo-cyan">
            <div className="flex size-8 items-center justify-center rounded-full bg-kojo-gradient text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-foreground leading-tight">
                {user?.email ?? "Loading..."}
              </p>
              <p className="text-xs text-muted-foreground leading-tight capitalize">
                {primaryRole.replace("_", " ")}
              </p>
            </div>
            <ChevronDown className="size-4 text-muted-foreground" strokeWidth={1.5} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="mr-2 size-4" strokeWidth={1.5} />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 size-4" strokeWidth={1.5} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
