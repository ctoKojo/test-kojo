# Kojobot — Design System & Visual Identity
## ملف الهوية البصرية الكاملة (النسخة الرسمية الملزمة للمشروع)

> هذا الملف هو المرجع الوحيد للـ UI في المشروع كله.
> أي component، أي screen، أي animation لازم يلتزم بكل ما فيه.
> ممنوع منعاً باتاً الخروج عن هذه المواصفات.

---

## 1. BRAND ESSENCE

**الاسم:** Kojobot  
**المعنى:** Kojo (مصنع باليابانية) + bot (روبوت) = مصنع الروبوتات  
**الـ Tagline:** "Your First Line."  
**الرسالة:** المكان الأول لتعلم البرمجة والروبوتات للأطفال (6-17 سنة)  
**الشخصية:** Friendly + Contemporary + Competent + Innovative  
**التوازن البصري:** Modern & Scientific + Friendly & Playful — مش واحد منهم لوحده

---

## 2. COLOR SYSTEM

### الألوان الأساسية (Brand Colors)

```css
:root {
  /* Primary Brand Colors — من الـ Brand Guidelines الرسمية */
  --kojo-navy:    #001F3F;  /* Dark Navy — الخلفية الثقيلة + النصوص على فاتح */
  --kojo-cyan:    #61BAE2;  /* Cyan — اللون الأول في الـ gradient + accent */
  --kojo-violet:  #6455F0;  /* Violet/Purple — اللون الثاني في الـ gradient */

  /* Gradient الرسمي (دايماً من cyan → violet) */
  --kojo-gradient:         linear-gradient(135deg, #61BAE2 0%, #6455F0 100%);
  --kojo-gradient-reverse: linear-gradient(135deg, #6455F0 0%, #61BAE2 100%);
  --kojo-gradient-vertical: linear-gradient(180deg, #61BAE2 0%, #6455F0 100%);

  /* Surface Colors */
  --kojo-bg-dark:    #001F3F;   /* الخلفية الداكنة الرئيسية */
  --kojo-bg-darker:  #001529;   /* أعمق — للـ sidebar والـ modals */
  --kojo-bg-card:    #0A2A4A;   /* كروت على خلفية داكنة */
  --kojo-bg-light:   #F4F7FB;   /* خلفية فاتحة للـ public pages */
  --kojo-bg-white:   #FFFFFF;   /* أبيض نقي */

  /* Text Colors */
  --kojo-text-primary:   #FFFFFF;   /* على خلفية داكنة */
  --kojo-text-secondary: #A8C4D8;   /* secondary text على داكن */
  --kojo-text-muted:     #5A7A94;   /* muted على داكن */
  --kojo-text-dark:      #001F3F;   /* على خلفية فاتحة */
  --kojo-text-dark-muted:#4A6280;   /* secondary على فاتح */

  /* Semantic / Status Colors */
  --kojo-success:  #22C55E;   /* نجاح — حضور — دفع */
  --kojo-warning:  #F59E0B;   /* تحذير — قسط قريب */
  --kojo-error:    #EF4444;   /* خطأ — غياب — حرمان */
  --kojo-info:     #61BAE2;   /* معلومات — يستخدم الـ cyan */

  /* Borders & Dividers */
  --kojo-border:       rgba(97, 186, 226, 0.15);  /* border خفيف على داكن */
  --kojo-border-light: rgba(0, 31, 63, 0.12);     /* border خفيف على فاتح */

  /* Opacity Variants للـ overlays */
  --kojo-cyan-10:   rgba(97, 186, 226, 0.10);
  --kojo-cyan-20:   rgba(97, 186, 226, 0.20);
  --kojo-violet-10: rgba(100, 85, 240, 0.10);
  --kojo-violet-20: rgba(100, 85, 240, 0.20);
}
```

### قواعد استخدام الألوان

**✅ مسموح:**
- gradient على الـ primary buttons + hero backgrounds + app icon
- `--kojo-navy` كخلفية رئيسية للـ dashboard (admin/trainer/reception)
- `--kojo-bg-light` كخلفية للـ public pages (login + student portal)
- `--kojo-cyan` كـ accent color للـ active states + links + icons
- `--kojo-violet` للـ highlights + notifications badges
- الـ pattern (رموز الـ brand) كـ background texture بـ opacity منخفض (5-10%)

**❌ ممنوع:**
- ألوان خارج هذا الـ palette (لا أخضر، لا أحمر، لا برتقالي كألوان رئيسية — فقط كـ semantic)
- gradient بترتيب عكسي (violet → cyan) إلا لو في تنويع مقصود
- استخدام `--kojo-navy` كلون text على خلفية داكنة
- ألوان مشبّعة زيادة على عناصر كبيرة (لازم تكون الـ gradient في مساحات محدودة)

---

## 3. TYPOGRAPHY

### الخطوط الرسمية

```css
/* Title Font — للعناوين الكبيرة */
/* اسم الخط: DECOG (موجود في الـ brand assets) */
/* لو مش متاح كـ web font: استخدم Orbitron من Google Fonts كبديل */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');

/* Main Font — لكل النصوص */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

/* Arabic Font */
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap');

:root {
  --font-title:  'Orbitron', 'DECOG', monospace;   /* hero titles + brand name */
  --font-main:   'Poppins', sans-serif;             /* كل حاجة تانية (EN) */
  --font-arabic: 'Cairo', sans-serif;               /* النصوص العربية */
}
```

### Type Scale

```css
:root {
  --text-xs:   0.75rem;   /* 12px — labels, badges */
  --text-sm:   0.875rem;  /* 14px — secondary text, captions */
  --text-base: 1rem;      /* 16px — body text */
  --text-lg:   1.125rem;  /* 18px — large body */
  --text-xl:   1.25rem;   /* 20px — section titles */
  --text-2xl:  1.5rem;    /* 24px — page titles */
  --text-3xl:  1.875rem;  /* 30px — feature titles */
  --text-4xl:  2.25rem;   /* 36px — hero text */
  --text-5xl:  3rem;      /* 48px — display */
}
```

### قواعد استخدام الخطوط

| العنصر | الخط | الوزن | الحجم |
|--------|------|--------|--------|
| Brand Name / Logo Text | `--font-title` | 700 | حسب السياق |
| Page Hero Title | `--font-title` | 600-700 | `--text-4xl` |
| Section Title | `--font-main` | 600-700 | `--text-2xl` |
| Card Title | `--font-main` | 600 | `--text-xl` |
| Body Text | `--font-main` | 400 | `--text-base` |
| Labels & Badges | `--font-main` | 500 | `--text-xs` |
| Buttons | `--font-main` | 600 | `--text-sm` |
| Arabic Text | `--font-arabic` | 400-600 | نفس الـ scale |
| Monospace (code/IDs) | `monospace` | 400 | `--text-sm` |

---

## 4. SPACING & LAYOUT

```css
:root {
  /* Spacing Scale */
  --space-1:  0.25rem;  /* 4px */
  --space-2:  0.5rem;   /* 8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */

  /* Border Radius */
  --radius-sm:  0.375rem;  /* 6px — small elements */
  --radius-md:  0.75rem;   /* 12px — cards, inputs */
  --radius-lg:  1rem;      /* 16px — modals, panels */
  --radius-xl:  1.5rem;    /* 24px — large cards */
  --radius-full: 9999px;   /* pills, avatars */

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,31,63,0.12), 0 1px 2px rgba(0,31,63,0.08);
  --shadow-md: 0 4px 16px rgba(0,31,63,0.15), 0 2px 6px rgba(0,31,63,0.10);
  --shadow-lg: 0 10px 40px rgba(0,31,63,0.20), 0 4px 12px rgba(0,31,63,0.12);
  --shadow-glow-cyan:   0 0 20px rgba(97,186,226,0.30);
  --shadow-glow-violet: 0 0 20px rgba(100,85,240,0.30);
  --shadow-gradient:    0 8px 32px rgba(100,85,240,0.25);

  /* Layout */
  --sidebar-width:      240px;
  --sidebar-collapsed:  64px;
  --topbar-height:      64px;
  --content-max-width:  1280px;
}
```

---

## 5. COMPONENTS — المواصفات الكاملة

### 5.1 Buttons

```
Primary Button:
  - background: var(--kojo-gradient)
  - color: white
  - border-radius: var(--radius-md)
  - padding: 10px 24px
  - font: var(--font-main) 600 14px
  - shadow: var(--shadow-gradient)
  - hover: opacity 0.9 + translateY(-1px)
  - active: translateY(0) + opacity 0.8
  - disabled: opacity 0.4 + cursor not-allowed

Secondary Button:
  - background: transparent
  - border: 1px solid var(--kojo-cyan)
  - color: var(--kojo-cyan)
  - hover: background var(--kojo-cyan-10)

Danger Button:
  - background: transparent
  - border: 1px solid var(--kojo-error)
  - color: var(--kojo-error)
  - hover: background rgba(239,68,68,0.10)

Ghost Button:
  - background: transparent
  - color: var(--kojo-text-secondary)
  - hover: background var(--kojo-cyan-10) + color var(--kojo-cyan)
```

### 5.2 Cards

```
Default Card (على خلفية داكنة):
  - background: var(--kojo-bg-card)
  - border: 1px solid var(--kojo-border)
  - border-radius: var(--radius-lg)
  - padding: var(--space-6)
  - shadow: var(--shadow-md)
  - hover: border-color var(--kojo-cyan-20) + shadow-glow-cyan

Gradient Card (featured/highlighted):
  - background: var(--kojo-gradient)
  - color: white
  - border-radius: var(--radius-xl)
  - padding: var(--space-8)

Stat Card (KPIs & Numbers):
  - background: var(--kojo-bg-card)
  - border-left: 3px solid var(--kojo-cyan) [أو violet حسب النوع]
  - padding: var(--space-6)
```

### 5.3 Form Inputs

```
Input Field:
  - background: rgba(255,255,255,0.05)
  - border: 1px solid var(--kojo-border)
  - border-radius: var(--radius-md)
  - color: var(--kojo-text-primary)
  - padding: 10px 14px
  - font: var(--font-main) 14px
  - focus: border-color var(--kojo-cyan) + box-shadow 0 0 0 3px var(--kojo-cyan-10)
  - placeholder: var(--kojo-text-muted)

Select / Dropdown:
  - نفس الـ input + custom arrow بـ cyan color

Error State:
  - border-color: var(--kojo-error)
  - focus shadow: rgba(239,68,68,0.15)
```

### 5.4 Badges & Status Tags

```
Present / Active / Success:
  - background: rgba(34,197,94,0.15)
  - color: #22C55E
  - border: 1px solid rgba(34,197,94,0.30)

Absent / Restricted / Error:
  - background: rgba(239,68,68,0.15)
  - color: #EF4444
  - border: 1px solid rgba(239,68,68,0.30)

Warning / Pending:
  - background: rgba(245,158,11,0.15)
  - color: #F59E0B
  - border: 1px solid rgba(245,158,11,0.30)

Info / Waiting:
  - background: var(--kojo-cyan-10)
  - color: var(--kojo-cyan)
  - border: 1px solid var(--kojo-cyan-20)

Package Badges:
  Squad:  background cyan gradient (subtle) + text navy
  Core:   background violet gradient (subtle) + text white
  X:      background full gradient + text white + shadow-gradient
```

### 5.5 Navigation / Sidebar

```
Sidebar:
  - background: var(--kojo-bg-darker)
  - width: var(--sidebar-width)
  - border-right: 1px solid var(--kojo-border)
  - Logo area: padding 24px + logo بحجم مناسب

Nav Item:
  - color: var(--kojo-text-secondary)
  - padding: 10px 16px
  - border-radius: var(--radius-md)
  - icon + label
  - hover: background var(--kojo-cyan-10) + color var(--kojo-cyan)
  
Active Nav Item:
  - background: var(--kojo-gradient) [بـ opacity خفيف] أو
  - background: var(--kojo-cyan-10)
  - color: var(--kojo-cyan)
  - border-left: 3px solid var(--kojo-cyan)
  - font-weight: 600

Topbar:
  - background: var(--kojo-bg-darker)
  - height: var(--topbar-height)
  - border-bottom: 1px solid var(--kojo-border)
```

### 5.6 Tables

```
Table Container:
  - background: var(--kojo-bg-card)
  - border: 1px solid var(--kojo-border)
  - border-radius: var(--radius-lg)
  - overflow: hidden

Table Header:
  - background: rgba(97,186,226,0.08)
  - color: var(--kojo-text-secondary)
  - font-weight: 600
  - font-size: 12px
  - text-transform: uppercase
  - letter-spacing: 0.05em

Table Row:
  - border-bottom: 1px solid var(--kojo-border)
  - color: var(--kojo-text-primary)
  - hover: background rgba(97,186,226,0.05)

Table Row (alternating):
  - لا تستخدم alternating colors — استخدم hover فقط
```

### 5.7 Modals & Dialogs

```
Overlay:
  - background: rgba(0,21,41,0.80)
  - backdrop-filter: blur(4px)

Modal:
  - background: var(--kojo-bg-card)
  - border: 1px solid var(--kojo-border)
  - border-radius: var(--radius-xl)
  - shadow: var(--shadow-lg)
  - max-width: 560px (default) | 760px (large)
  - padding: var(--space-8)

Modal Header:
  - border-bottom: 1px solid var(--kojo-border)
  - padding-bottom: var(--space-4)
  - title: font-weight 700, size text-xl
  - close button: ghost style
```

### 5.8 Notifications & Alerts

```
In-App Notification Toast:
  - position: top-right
  - background: var(--kojo-bg-card)
  - border-left: 4px solid [status color]
  - border-radius: var(--radius-md)
  - shadow: var(--shadow-lg)
  - animation: slide-in from right

Alert Banner:
  - border-radius: var(--radius-md)
  - padding: var(--space-4) var(--space-5)
  - icon + text + optional action
  - نفس الألوان semantic فوق دي
```

---

## 6. LOGO USAGE RULES

### الـ Logo Variations المتاحة

| الـ Variation | الاستخدام |
|--------------|-----------|
| Full logo (icon + wordmark horizontal) | الـ Sidebar header |
| Wordmark only (Kojobot text) | الـ Topbar على صفحات الـ public |
| Icon only (OJ robot mark) | App icon, favicon, small spaces |
| White version | على الـ gradient backgrounds |
| Colored gradient version | على الـ white/light backgrounds |
| Dark navy version | على الـ white backgrounds فقط |

### قواعد الـ Logo

```
Safe Area: مسافة = عرض حرف X في الـ logo من كل الجهات
Minimum Size: 80px width للـ full logo, 24px للـ icon
لا تدوير، لا تمطيط، لا تغيير الألوان
على خلفية داكنة: الـ white version فقط
على خلفية فاتحة: الـ gradient أو الـ dark version
```

---

## 7. ICONS

```
المكتبة: Lucide React (متوفرة في Lovable بالفعل)
الحجم القياسي: 20px (داخل الـ nav) | 16px (داخل الـ badges/buttons) | 24px (standalone)
اللون: يرث من parent element
Stroke Width: 1.5px (الافتراضي — لا تغيره)
لا تستخدم filled icons — استخدم outlined فقط
```

### Icons لكل Role / Domain

```
Students:        Users, User, GraduationCap, BookOpen
Sessions:        Video, Clock, Calendar, PlayCircle
Attendance:      CheckCircle, XCircle, AlertCircle
Assignments:     FileText, Upload, PenLine
Quizzes:         HelpCircle, CheckSquare, Award
Payments:        CreditCard, Wallet, DollarSign, Receipt
Treasury:        Building2, Landmark, PiggyBank
Groups:          Users2, Layers, Grid
Trainer:         UserCheck, ChalkboardTeacher (custom)
Compensation:    RotateCcw, RefreshCw
Notifications:   Bell, BellRing
Settings:        Settings, SlidersHorizontal
Reports:         BarChart2, TrendingUp, PieChart
Warnings:        AlertTriangle, Shield
Certificates:    Award, Star, Trophy
```

---

## 8. BACKGROUND PATTERNS

```
الـ Pattern الرسمي: رموز الـ brand (O, ↑, ↙, X) في grid
الاستخدام: background-image كـ texture

على الخلفية الداكنة:
  - pattern بـ opacity: 0.05 (كاد يكون مرئي)
  - لون: white

على الخلفية الـ gradient:
  - pattern بـ opacity: 0.10
  - لون: white

لا تستخدم الـ pattern على الخلفية الفاتحة
```

---

## 9. DASHBOARD LAYOUTS

### Admin / Reception / Branch Admin Dashboard

```
Layout: Sidebar (fixed left) + Topbar + Content Area
Theme: Dark (--kojo-bg-dark)

Sidebar:
  - Background: --kojo-bg-darker
  - Logo: top
  - Nav items: بـ icons + labels
  - User profile: bottom
  - Branch selector: top (under logo)

Topbar:
  - Page title (left)
  - Search (center, optional)
  - Notifications bell + User avatar (right)

Content:
  - Padding: 24px
  - Max-width: 100% (full width داخل الـ content area)
  - Grid: 12-column flexible
```

### Trainer Dashboard

```
Layout: نفس الـ admin لكن بـ sidebar مختصر
الـ session view: بتاخد 60% من الشاشة
الحضور + التقييم: على اليمين (40%)
```

### Student / Parent Portal

```
Theme: Light (--kojo-bg-light) أو gradient hero + white content
Layout: Top navigation (مش sidebar)
Hero: gradient background مع الـ logo mark كـ watermark
Progress indicators: واضحة ومحورية
```

---

## 10. MOTION & ANIMATIONS

```css
/* Timing Functions */
--ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);  /* معظم الحركات */
--ease-bounce:  cubic-bezier(0.34, 1.56, 0.64, 1);  /* للـ notifications */
--ease-sharp:   cubic-bezier(0.4, 0, 0.6, 1);  /* للإغلاق */

/* Durations */
--duration-fast:   150ms;  /* hover states */
--duration-normal: 250ms;  /* transitions */
--duration-slow:   400ms;  /* page transitions, modals */

/* Standard Transitions */
.transition-all { transition: all var(--duration-normal) var(--ease-smooth); }
.transition-colors { transition: color, background-color, border-color var(--duration-fast) var(--ease-smooth); }
```

### Animation Rules

```
Page Load: fade-in + translateY(8px → 0) بـ stagger للـ cards
Modal: scale(0.96 → 1) + opacity(0 → 1)
Toast: translateX(100% → 0) + opacity
Skeleton: shimmer animation من navy → card-bg
Button hover: translateY(-1px) بـ 150ms
Nav item: background + color transition بـ 150ms
Numbers/Stats: count-up animation عند الظهور (optional)
```

---

## 11. DARK / LIGHT MODE

```
الـ Dashboard (Admin/Trainer/Reception): Dark Mode فقط — لا يوجد light mode
الـ Student/Parent Portal: Light Mode افتراضي — dark mode optional
الـ Login Page: Dark mode مع gradient hero

لا تضيف dark mode toggle في الـ dashboard
```

---

## 12. RESPONSIVE BREAKPOINTS

```css
/* Breakpoints */
--bp-sm:  640px;   /* موبايل كبير */
--bp-md:  768px;   /* تابلت */
--bp-lg:  1024px;  /* لابتوب */
--bp-xl:  1280px;  /* ديسكتوب */

/* Sidebar على موبايل */
@media (max-width: 768px) {
  sidebar → drawer (يتفتح/يتقفل)
  topbar → يشمل hamburger menu
}
```

---

## 13. ACCESSIBILITY

```
Contrast Ratios:
  - Text على --kojo-bg-dark: minimum 4.5:1
  - Primary text (#fff على #001F3F): 15.3:1 ✅
  - Cyan (#61BAE2 على #001F3F): 7.2:1 ✅
  - Secondary text (#A8C4D8 على #001F3F): 5.1:1 ✅

Focus States:
  - كل interactive element عنده outline
  - outline: 2px solid var(--kojo-cyan)
  - outline-offset: 2px

Screen Readers:
  - كل icon يصاحبه aria-label
  - Status badges تشمل text مش بس لون
```

---

## 14. DO & DON'T — الملخص التنفيذي

### ✅ DO

- استخدم دايماً الألوان من `--kojo-*` variables
- الـ gradient يبدأ دايماً من cyan ويخلص بـ violet
- الخلفية الرئيسية للـ dashboard هي `--kojo-bg-dark` (#001F3F)
- كل button رئيسي ليه الـ gradient
- الـ font للنصوص هو Poppins، وللعناوين الكبيرة Orbitron
- الـ Cairo للنصوص العربية فقط
- استخدم الـ pattern كـ texture خفية في الـ hero sections
- الـ status colors: أخضر للنجاح، أحمر للخطأ، أصفر للتحذير، cyan للمعلومات

### ❌ DON'T

- لا تستخدم Inter, Roboto, Arial أبداً
- لا تعمل gradient من violet → cyan (العكس فقط)
- لا تستخدم ألوان برتقالية أو وردية أو بنية كألوان رئيسية
- لا تستخدم filled icons
- لا تضع الـ logo بدون safe area
- لا تغير الـ border-radius من الـ design system
- لا تستخدم box shadows بألوان غير `--kojo-*`
- لا تضع background أبيض في الـ dashboard (فقط في الـ student portal)
- لا تستخدم hardcoded colors في الـ components — دايماً من الـ CSS variables

---

## 15. TAILWIND CONFIG (لو بتستخدم Tailwind في Lovable)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        kojo: {
          navy:   '#001F3F',
          cyan:   '#61BAE2',
          violet: '#6455F0',
          'bg-card': '#0A2A4A',
          'bg-darker': '#001529',
        }
      },
      fontFamily: {
        title:  ['Orbitron', 'monospace'],
        main:   ['Poppins', 'sans-serif'],
        arabic: ['Cairo', 'sans-serif'],
      },
      backgroundImage: {
        'kojo-gradient': 'linear-gradient(135deg, #61BAE2 0%, #6455F0 100%)',
        'kojo-gradient-v': 'linear-gradient(180deg, #61BAE2 0%, #6455F0 100%)',
      },
      boxShadow: {
        'kojo-glow': '0 0 20px rgba(97,186,226,0.30)',
        'kojo-gradient': '0 8px 32px rgba(100,85,240,0.25)',
      },
      borderRadius: {
        'kojo-sm': '6px',
        'kojo-md': '12px',
        'kojo-lg': '16px',
        'kojo-xl': '24px',
      }
    }
  }
}
```

---

## 16. SHADCN THEME OVERRIDE (لـ Lovable)

```css
/* في globals.css — override الـ shadcn defaults بالـ Kojobot colors */
:root {
  --background:   0 0% 100%;           /* --kojo-bg-light */
  --foreground:   214 100% 12%;        /* --kojo-navy */
  --primary:      246 83% 64%;         /* --kojo-violet */
  --primary-foreground: 0 0% 100%;
  --ring:         199 64% 63%;         /* --kojo-cyan */
  --radius:       0.75rem;             /* --radius-md */
}

.dark {
  --background:   214 100% 12%;        /* --kojo-navy */
  --foreground:   0 0% 100%;
  --card:         214 85% 15%;         /* --kojo-bg-card */
  --card-foreground: 0 0% 100%;
  --border:       199 64% 63% / 0.15;  /* --kojo-border */
  --primary:      246 83% 64%;         /* --kojo-violet */
  --primary-foreground: 0 0% 100%;
  --secondary:    214 70% 20%;
  --secondary-foreground: 0 0% 100%;
  --muted:        214 70% 20%;
  --muted-foreground: 200 30% 65%;
  --accent:       199 64% 63%;         /* --kojo-cyan */
  --accent-foreground: 214 100% 12%;
  --ring:         199 64% 63%;
}
```

---

## 17. PAGE-BY-PAGE VISUAL DIRECTION

| الصفحة | الثيم | الـ Hero | الملاحظات |
|--------|-------|---------|-----------|
| Login | Dark | Gradient كامل + pattern | الـ form card على dark navy |
| Admin Dashboard | Dark | KPIs في أعلى | Sidebar + stat cards |
| Students List | Dark | — | Table + filters |
| Student Profile | Dark | Gradient header section | Progress + history |
| Session View | Dark | — | الحضور + التقييم side by side |
| Session (Trainer Active) | Dark | — | fullscreen-like, focus على الحضور |
| Financial Dashboard | Dark | — | Charts + treasury cards |
| Student Portal | Light | Gradient hero | Clean, friendly |
| Parent Portal | Light | — | نفس الـ student portal |
| Entry Test | Light + Gradient | — | Progress bar واضحة |

---

*آخر تحديث: May 2025 — Kojobot Design System v1.0*
*هذا الملف ملزم لكل مكون في المشروع. أي إضافة feature جديدة لازم تلتزم بهذا الملف.*
