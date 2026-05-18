// Kojo Academy — Permissions matrix (SINGLE SOURCE OF TRUTH)
// Whitelist-based: any (role × action × resource) not listed = denied.
// Mirror of RLS policies in DB. Used by <RoleGuard /> + useAuth().can().
// TODO: implement after Phase 0 Chunk 1.
//
// Shape (planned):
//   type Resource = 'student' | 'session' | 'payment' | 'group' | ...
//   type Action = 'view' | 'create' | 'update' | 'delete' | 'close' | 'refund' | ...
//   const matrix: Record<AppRole, Partial<Record<Resource, Action[]>>> = { ... }
export {};
