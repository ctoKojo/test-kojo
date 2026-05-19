# Phase 1 — Foundation UI (Design System + Auth)

الهدف: نحوّل `DESIGN_SYSTEM.md` لـ tokens فعلية + نبني auth flow كامل (login + role-based redirect + guards). بعد كده أي صفحة جديدة تكون عندها أساس صح من غير ما نعيد البنية.

## النطاق

### 1. Design Tokens في `src/styles.css`
- ندخل ألوان Kojobot (Navy/Cyan/Violet) كـ `oklch` في `:root` و `.dark`.
- ندخل الـ shadcn semantic tokens (`--primary`, `--background`, `--card`...) متربوطة بألوان Kojo حسب section 16 من الـ design system.
- ندخل tokens إضافية مش في shadcn:
  - `--kojo-gradient` (cyan → violet 135°)
  - `--kojo-bg-darker` / `--kojo-bg-card`
  - `--kojo-cyan` / `--kojo-violet` / `--kojo-navy` (للوصول المباشر)
  - status colors: `--success` / `--warning` / `--info`
  - shadows: `--shadow-glow-cyan` / `--shadow-gradient`
- ندخل الفونتات: Orbitron (titles) + Poppins (body) + Cairo (Arabic) من Google Fonts.
- نخلي الـ `dark` class مفعّل افتراضياً على `<html>` للداشبورد، والـ public pages تستخدم theme manual.

### 2. Tailwind utilities (في `@theme inline`)
- نضيف:
  - `font-title` / `font-main` / `font-arabic`
  - `bg-kojo-gradient` كـ utility
  - `text-kojo-cyan` / `text-kojo-violet` / `bg-kojo-card` ...
  - `shadow-kojo-glow` / `shadow-kojo-gradient`
- كده أي component في المستقبل يستخدم Tailwind classes متربوطة بالـ tokens مباشرة.

### 3. Shared UI primitives
- `<KojoButton>` (variants: primary gradient, secondary outline-cyan, ghost, danger) — wrapper حوالين shadcn `Button` مع variants Kojo.
- `<KojoCard>` (default, gradient, stat with left border).
- `<KojoBadge>` (success/error/warning/info/squad/core/x).
- كل دول في `src/components/ui/kojo/` ومش بيستبدلوا shadcn، بيمتدوهم.

### 4. Auth Implementation
- `src/lib/auth/useAuth.ts`:
  - hook حقيقي بيرجع `user`, `roles[]`, `activeBranchId`, `loading`, `signOut`, `hasRole`, `hasAnyRole`.
  - بيستخدم `supabase.auth.onAuthStateChange` + يجيب `user_roles` و `staff_employee_branches` على mount.
  - بيتخزن في React context (`AuthProvider`) محطوط في `__root.tsx`.
- `src/routes/_authenticated/route.tsx`:
  - `beforeLoad`: لو مفيش session → `redirect` لـ `/login`.
  - الـ component بيعرض `<DashboardShell>` (sidebar + topbar + outlet).
- `src/routes/index.tsx`:
  - `beforeLoad`: لو معاه session → smart redirect حسب الرول (super_admin/branch_admin → `/dashboard`, reception → `/reception`, trainer → `/trainer`, student → `/student`, parent → `/parent`). لو مفيش → `/login`.
- `src/routes/login.tsx`:
  - تصميم Dark + gradient hero (نص الصفحة) + كارت login على اليمين.
  - Email + password (signIn) + Google OAuth button.
  - شغّال `supabase.auth.signInWithPassword` و `signInWithOAuth({ provider: 'google' })`.
  - بعد النجاح: redirect لـ `/` (والـ index بيعمل smart routing).
- نفعّل Google provider عبر `configure_social_auth`.

### 5. Dashboard Shell
- `src/components/layout/DashboardShell.tsx`:
  - Sidebar dark (`--kojo-bg-darker`) + Logo placeholder + nav items بـ icons (Lucide).
  - Topbar (page title + notifications bell + user avatar dropdown مع sign-out).
  - Content area `<Outlet />`.
  - Responsive: على mobile الـ sidebar يبقى drawer.
- nav items مبدئية: Dashboard, Students, Groups, Sessions, Finance, Reports, Settings — كل واحدة معطلة (placeholder) ماعدا Dashboard.

### 6. تحديث `_authenticated/dashboard.tsx`
- صفحة بسيطة: 4 stat cards (Total Students / Active Groups / Today Sessions / Pending Payments) — كلها mock numbers دلوقتي.
- بتستخدم `<KojoCard variant="stat">` عشان نتأكد إن الـ design system شغال.

## Technical Notes

### Tokens mapping (oklch approximations)
```
#001F3F (navy)   → oklch(0.24 0.075 250)
#61BAE2 (cyan)   → oklch(0.75 0.10 230)
#6455F0 (violet) → oklch(0.55 0.21 280)
```

### File structure additions
```
src/
├── components/
│   ├── layout/
│   │   ├── DashboardShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   └── ui/kojo/
│       ├── kojo-button.tsx
│       ├── kojo-card.tsx
│       └── kojo-badge.tsx
├── lib/auth/
│   ├── AuthProvider.tsx   (new)
│   └── useAuth.ts          (rewrite)
└── routes/
    ├── __root.tsx          (wrap with AuthProvider)
    ├── index.tsx           (smart redirect)
    ├── login.tsx           (real form)
    └── _authenticated/
        ├── route.tsx       (real guard + shell)
        └── dashboard.tsx   (stat cards)
```

## ما هو خارج النطاق دلوقتي
- صفحات Students/Groups/Sessions الكاملة.
- الـ data fetching الفعلي (الـ dashboard mock).
- Notifications dropdown مع بيانات حقيقية.
- Mobile drawer animation polish (بس responsive basic).
- ترجمات (RTL/Arabic toggle) — هتتم في Phase 2.

## ترتيب التنفيذ
1. تحديث `styles.css` بكل الـ tokens + import الفونتات.
2. إضافة Kojo UI primitives (button, card, badge).
3. كتابة `AuthProvider` + `useAuth` الحقيقي + لفه حوالين الـ root.
4. تحديث `login.tsx` بالـ form الكامل + تفعيل Google.
5. تحديث `index.tsx` بالـ smart redirect.
6. تحديث `_authenticated/route.tsx` بالـ guard + `<DashboardShell>`.
7. كتابة `Sidebar` + `Topbar` + `DashboardShell`.
8. تحديث `_authenticated/dashboard.tsx` بـ stat cards.
9. اختبار: login → redirect → dashboard يظهر صح.
