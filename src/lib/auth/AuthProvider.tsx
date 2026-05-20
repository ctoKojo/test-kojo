// Kojobot — Auth Provider
// Wraps the app with authentication state.
// Single source of truth for: user, roles[], activeBranchId, signOut.
//
// Rules (per /DESIGN_SYSTEM.md and project memory):
//  - super_admin → activeBranchId = null (sees everything)
//  - other roles → first active branch from user_roles
//  - revoked_at IS NULL is required for a role to count

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  activeBranchId: string | null;
  branchIds: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const PUBLIC_ROLE: AppRole = "super_admin"; // for type narrowing only

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch roles + branches for a user
  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role, branch_id")
      .eq("user_id", uid)
      .is("revoked_at", null);

    if (error) {
      console.error("[auth] failed to load user_roles", error);
      setRoles([]);
      setBranchIds([]);
      setActiveBranchId(null);
      return;
    }

    const userRoles = (data ?? []).map((r) => r.role as AppRole);
    const uniqueRoles = Array.from(new Set(userRoles));
    const userBranches = Array.from(
      new Set(
        (data ?? [])
          .map((r) => r.branch_id as string | null)
          .filter((b): b is string => !!b),
      ),
    );

    setRoles(uniqueRoles);
    setBranchIds(userBranches);

    // super_admin sees all branches → activeBranchId = null
    // other roles → first branch
    if (uniqueRoles.includes("super_admin")) {
      setActiveBranchId(null);
    } else {
      setActiveBranchId(userBranches[0] ?? null);
    }
  }, []);

  useEffect(() => {
    // 1) Subscribe FIRST (avoid missing the initial event)
    let lastUserId: string | null = null;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      const newUserId = newSession?.user?.id ?? null;
      const userChanged = newUserId !== lastUserId;
      lastUserId = newUserId;

      // Defer DB call to avoid deadlocks inside the callback
      // Only reload profile when the user actually changes (skip TOKEN_REFRESHED)
      if (newSession?.user && userChanged) {
        setTimeout(() => {
          loadProfile(newSession.user.id);
        }, 0);
      } else if (!newSession?.user) {
        setRoles([]);
        setBranchIds([]);
        setActiveBranchId(null);
      }

      // Only invalidate on real auth transitions — not on every token refresh
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.invalidate();
        queryClient.invalidateQueries();
      }
    });

    // 2) Then check existing session
    supabase.auth.getSession().then(async ({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        lastUserId = existing.user.id;
        await loadProfile(existing.user.id);
      } else {
        setRoles([]);
        setBranchIds([]);
        setActiveBranchId(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile, router, queryClient]);

  const hasRole = useCallback(
    (role: AppRole) => roles.includes(role),
    [roles],
  );
  const hasAnyRole = useCallback(
    (needed: AppRole[]) => needed.some((r) => roles.includes(r)),
    [roles],
  );

  const signOut = useCallback(async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRoles([]);
    setBranchIds([]);
    setActiveBranchId(null);
    setIsLoading(false);
  }, []);

  const value: AuthState = {
    user,
    session,
    roles,
    activeBranchId,
    branchIds,
    isAuthenticated: !!session,
    isLoading,
    hasRole,
    hasAnyRole,
    signOut,
  };

  // Suppress unused warning for PUBLIC_ROLE (kept for typing reference)
  void PUBLIC_ROLE;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

/**
 * Smart redirect path based on user roles.
 * Used by /index.tsx to send freshly-logged-in users to the right place.
 */
export function getHomeForRoles(roles: AppRole[]): string {
  if (roles.includes("super_admin") || roles.includes("branch_admin")) {
    return "/dashboard";
  }
  if (roles.includes("reception")) return "/dashboard";
  if (roles.includes("trainer")) return "/dashboard";
  if (roles.includes("sales")) return "/dashboard";
  if (roles.includes("moderator")) return "/dashboard";
  if (roles.includes("student")) return "/dashboard";
  if (roles.includes("parent")) return "/dashboard";
  return "/dashboard";
}
