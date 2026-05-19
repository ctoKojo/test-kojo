# Chunk 7 — Corrected Migration Plan

بناءً على فحص الـ DB الفعلي + إجابات البيزنس لوجيك. الهدف: إغلاق Phase 0 بشكل صحيح ومتسق مع الـ schema الموجود (مفيش schema mismatch، مفيش حاجة بتتعمل مرتين).

## القرارات (Business Logic)

| القرار | القيمة |
|---|---|
| Subscription | كل level له `monthly_price` و `full_level_price`. الطالب يختار وقت الـ enrollment. **No switching** وسط الليفيل. `full_level` ليست خصم — سعر مستقل. |
| Compensation models | `fixed_monthly`, `hourly_session`, `paid_training`, `unpaid_training`, `fixed_plus_commission`. لكل رول `allowed_models` set مختلف. |
| Hourly pay | يعتمد على مدة الـ session الفعلية (`scheduled_end_at_utc - scheduled_at_utc`) فقط لو الـ session = `completed`. |
| KPI bonus | per-role rules في جدول مستقل. حساب تلقائي شهري → موافقة إدمن قبل الصرف. |
| Sibling discount | تلقائي من `system_policies`، **stackable** مع coupon. |
| Promo codes | جدول مستقل بصلاحية + حد استخدام. |
| Manual discount | بإذن إدمن (عبر `admin_approval_requests`). |

## الجداول الجديدة (10)

```text
1. trainer_unavailability           — طلبات إجازة/عدم توفر للمدربين
2. trainer_compensation_config      — model + rates لكل مدرب (history)
3. role_compensation_rules          — allowed_models لكل رول (validation)
4. trainer_monthly_payroll          — كشف رواتب شهري
5. role_kpi_bonus_rules             — قواعد البونص per-role
6. promo_codes                      — أكواد خصم
7. enrollment_discounts             — audit كل الخصومات المطبقة على enrollment
```

## التعديلات على جداول موجودة

| الجدول | التعديل |
|---|---|
| `packages` | إضافة `full_level_price numeric(12,2)` (alongside `price` الشهري) |
| `group_enrollments` | إضافة `billing_type` enum (`monthly` / `full_level`) + `package_id` (موجود لكن قد يكون اختياري) |
| `enrollment_status` enum | إضافة قيمة `waiting` (للـ waiting-list) |

## Enums جديدة

```sql
compensation_model:  fixed_monthly | hourly_session | paid_training | unpaid_training | fixed_plus_commission
billing_type:        monthly | full_level
discount_source:     sibling | promo_code | manual_admin | full_level_price
```

## RPCs (4 + 2 supplementary)

| RPC | الوظيفة |
|---|---|
| `rpc_enroll_student` | يسجل الطالب في group + ينشئ subscription + payment + installments + يطبق sibling/coupon discounts |
| `rpc_assign_trainer` | يعيد تعيين مدرب لمجموعة + يحدّث `group_sessions` المستقبلية من `effective_from` |
| `rpc_request_unavailability` | يسجل طلب عدم توفر للمدرب مع overlap check |
| `rpc_calculate_trainer_payroll` | يحسب base + session_pay + KPI bonus pending لشهر معين |
| `rpc_approve_kpi_bonus` | الإدمن يوافق على البونص (يحرك من pending → approved) |
| `rpc_apply_promo_code` | validate + يربط كود بـ enrollment |

## Triggers

| Trigger | الجدول | الغرض |
|---|---|---|
| `trg_waiting_list_promote` | `group_enrollments` AFTER UPDATE | لما enrollment يبقى `dropped`/`completed`، أول `waiting` في نفس الـ group يتحول `active` |
| `trg_validate_trainer_comp_model` | `trainer_compensation_config` BEFORE INSERT/UPDATE | يتأكد إن الـ model مسموح للرول بتاع المدرب |
| `trg_validate_billing_type` | `group_enrollments` BEFORE INSERT | يتأكد إن `full_level` متاح في الـ package (يعني `full_level_price IS NOT NULL`) |

## RLS Policies

كل الجداول الجديدة:
- **read**: `has_any_role(super_admin, branch_admin, reception)` + scope بـ `current_user_branch_ids()`
- **write**: `super_admin` أو `branch_admin` للجدول. `trainer_unavailability` المدرب يقدر يكتب طلب لنفسه فقط.
- `enrollment_discounts`: قراءة للـ student/parent عن طريق join على `students`/`parent_student_links` (نفس pattern الموجود).

## الـ Naming Conventions الصحيحة (لازم نلتزم بيها)

- ✅ `has_any_role(auth.uid(), ARRAY[...]::app_role[])` — ليس `profiles.role`
- ✅ `set_updated_at()` trigger function — ليس `fn_set_updated_at`
- ✅ `get_policy('key')` — ليس `fn_get_active_policy`
- ✅ `idempotency_keys` (key, operation, response, expires_at)
- ✅ `log_audit(actor, action, resource_type, resource_id, branch_id, before, after)`
- ✅ كل RPC: `SECURITY DEFINER` + `SET search_path = public` + `REVOKE EXECUTE ... FROM PUBLIC, anon`

## ما هو خارج النطاق الآن

- UI / frontend code — يبدأ بعد Phase 0 يخلص ويتأكد بكل الـ checks.
- Edge Functions — نستخدم TanStack server functions لاحقاً.
- ترجمة `DESIGN_SYSTEM.md` لـ tokens — Phase 1.

## ترتيب التنفيذ

1. Migration A (Enums + Schema additions): enums الجديدة + أعمدة جديدة على `packages`/`group_enrollments` + `enrollment_status += waiting`.
2. Migration B (New Tables + RLS): الـ 7 جداول الجديدة + RLS + indexes.
3. Migration C (RPCs + Triggers): الـ 6 RPCs + الـ 3 triggers + REVOKE statements.
4. Linter check → يفترض يفضل على 18 تحذير by-design.
5. Seed `role_compensation_rules` defaults (trainer = all 4 models, others = fixed_monthly).
6. تحديث `src/integrations/supabase/types.ts` يتولد تلقائياً.

## بعد ما تخلص

- Phase 0 = 100% complete.
- جاهزين لـ Phase 1 (UI): نبدأ بتطبيق `DESIGN_SYSTEM.md` كـ tokens في `styles.css`، وبعدها login/auth بشكل صحيح.
