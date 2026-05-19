# Phase 0 Audit — Chunks 1–4 Status Report

تم فحص كل اللي اتعمل من بداية المشروع لحد دلوقتي. ده تقرير شامل بحالة كل حاجة.

## 1. Database — مطابق للخطة 100%

**48 جدول + 1 view** موجودين فعليًا في الـ DB، مطابقين لكل تشانك:

| Chunk | المطلوب | الموجود | الحالة |
|---|---|---|---|
| 1 — Identity/Config | 15 | 15 | ✓ |
| 2 — Academic/Operations | 14 | 14 | ✓ |
| 3 — Financial | 10 | 10 | ✓ |
| 4 — Assessments/Progression | 9 | 9 | ✓ |
| **Total** | **48** | **48 + view** | ✓ |

- كل جدول عنده Primary Key (0 بدون PK).
- **RLS مفعّلة على كل الـ 48 جدول** (0 جداول بدون RLS).
- 23 enum، كلهم متسقين مع الـ schema.
- 6 RLS helpers شغّالين: `has_role`, `has_any_role`, `is_super_admin`, `current_user_branch_ids`, `get_policy`, `log_audit`.
- 19 function (12 trigger fn + 4 financial RPC + 4 academic RPC + الـ exam/quiz pass triggers).
- Triggers على كل الـ tables المطلوبة (snapshot policies, capacity validation, attendance lock, treasury balance, sibling discount, auto-grading).

## 2. Code Organization — مفيش سباجيتي

- `src/lib/api/*.ts` — كلها stubs فاضية (`export {};`) بتعليق TODO يربط كل ملف بالـ chunk المناسب. ده مقصود — UI لسه ما بنتش.
- `src/lib/auth/{useAuth.ts, RoleGuard.tsx, permissions.ts}` — stubs بتعليق متى تتنفذ.
- `src/routes/` — البنية صحيحة: `__root.tsx`, `index.tsx` (redirect لـ /login), `login.tsx`, `_authenticated/route.tsx` (layout pathless), `_authenticated/dashboard.tsx`.
- `routeTree.gen.ts` متولّد تلقائيًا — مفيش تعديل يدوي.
- `DESIGN_SYSTEM.md` في الـ root، ولسه ما اتترجمش لـ `styles.css` (مؤجل عن قصد لحد ما UI تبدأ).
- مفيش أي ملف بيلف business logic، مفيش direct supabase calls في components، مفيش duplicate clients.

## 3. ملاحظات بسيطة من اللينتر (22 تحذير، أغلبها مقصود)

- **17 تحذير "SECURITY DEFINER callable by signed-in users"** — دي helpers زي `has_role`, `is_super_admin`, `current_user_branch_ids`, `get_policy`, `log_audit`. لازم تكون قابلة للنداء من المستخدمين علشان الـ RLS policies تشتغل. ده by design ومذكور في الخطة.
- **1 تحذير Extension in Public** — `btree_gist` (مطلوب للـ exclusion constraints على overlapping schedules). مقصود.
- **4 تحذيرات "Public Can Execute"** — دي مشكلة حقيقية بسيطة:
  - `rpc_grade_assignment`, `rpc_record_progression`, `rpc_submit_assignment`, `rpc_submit_quiz_attempt` (من Chunk 4) ناقصها `REVOKE EXECUTE ... FROM PUBLIC, anon`. لازم تتمنع من anon (مش signed-in users).

## 4. خلاصة

**الـ 4 chunks تمام ومتوافقين مع الخطة.** الـ DB structure، الـ RLS، الـ triggers، والـ RPCs كلها شغّالة. مفيش سباجيتي في الكود. الـ frontend stubs مرتبة ومُعلّقة كويس.

في حاجة واحدة صغيرة عايزة hardening قبل ما ننتقل لـ Chunk 5: نمنع anon من نداء الـ 4 RPCs بتاعة Chunk 4.

## 5. الخطة المقترحة

### Migration تصحيحية (سطر واحد لكل RPC)

```sql
REVOKE EXECUTE ON FUNCTION public.rpc_grade_assignment(...)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rpc_record_progression(...)FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rpc_submit_assignment(...) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rpc_submit_quiz_attempt(...) FROM PUBLIC, anon;
```

### بعد كده

- نأكد اللينتر نزل من 22 لـ 18 تحذير (الـ 18 الباقيين by design).
- بعدها جاهزين تمامًا لـ **Chunk 5**.

## ما هو خارج النطاق دلوقتي

- ترجمة `DESIGN_SYSTEM.md` لـ tokens في `styles.css`.
- بناء أي UI أو ملء stubs في `src/lib/api/`.
- Chunk 5 (Compensation sessions, trainer unavailability, staff profiles, KPIs).
