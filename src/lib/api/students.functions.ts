// Kojobot — Server functions for creating students.
// Uses admin client to create an auth user, then profile + student rows.
// Requires the caller to be authenticated with super_admin / branch_admin / reception.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  full_name: z.string().min(2).max(120),
  phone: z.string().min(6).max(40).optional().nullable(),
  email: z.string().email().max(180).optional().nullable(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  gender: z.enum(["male", "female"]).optional().nullable(),
  branch_id: z.string().uuid(),
  age_group_id: z.string().uuid().optional().nullable(),
  school: z.string().max(180).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateStudentInput = z.infer<typeof InputSchema>;

function randomPassword(): string {
  // 24 chars, URL-safe
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const createStudentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1) Check caller role
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("role, branch_id")
      .eq("user_id", userId)
      .is("revoked_at", null);
    if (rolesErr) throw new Error(`Failed to verify permissions: ${rolesErr.message}`);

    const isSuperAdmin = (roles ?? []).some((r) => r.role === "super_admin");
    const canCreate =
      isSuperAdmin ||
      (roles ?? []).some(
        (r) =>
          (r.role === "branch_admin" || r.role === "reception") &&
          r.branch_id === data.branch_id,
      );
    if (!canCreate) {
      throw new Error("Forbidden: you cannot create students in this branch");
    }

    // 2) Create auth user (or reuse if email exists)
    const email =
      data.email ||
      `student+${crypto.randomUUID().slice(0, 8)}@students.kojobot.local`;
    const password = randomPassword();

    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: data.full_name,
          created_via: "kojobot-add-student",
        },
      });
    if (createErr || !created.user) {
      throw new Error(`Failed to create user: ${createErr?.message ?? "unknown"}`);
    }
    const newUserId = created.user.id;

    // 3) Upsert profile (trigger may have already created one)
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: newUserId,
          full_name: data.full_name,
          phone: data.phone ?? null,
          email: data.email ?? null,
        },
        { onConflict: "id" },
      );
    if (profileErr) {
      // rollback the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      throw new Error(`Failed to create profile: ${profileErr.message}`);
    }

    // 4) Insert student row
    const { data: studentRow, error: studentErr } = await supabaseAdmin
      .from("students")
      .insert({
        profile_id: newUserId,
        branch_id: data.branch_id,
        age_group_id: data.age_group_id ?? null,
        birthdate: data.birthdate ?? null,
        gender: data.gender ?? null,
        school: data.school ?? null,
        notes: data.notes ?? null,
        subscription_status: "pending_payment",
      })
      .select("id")
      .single();
    if (studentErr || !studentRow) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      throw new Error(`Failed to create student: ${studentErr?.message ?? "unknown"}`);
    }

    // 5) Add student role
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUserId,
      role: "student",
      branch_id: data.branch_id,
    });

    return { id: studentRow.id, profile_id: newUserId };
  });
