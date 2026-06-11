# MoneyFlow Design System — Full Token Reference

> Complete, authoritative dump of every design token. Source of truth: `app/globals.css` (HSL CSS
> variables) + `tailwind.config.js` (Tailwind utility mappings). Snapshot: 2026-06-11. When a value
> here disagrees with `app/globals.css`, the CSS file wins — re-check before relying on a specific value.

## Contents
1. [How tokens are wired](#1-how-tokens-are-wired)
2. [Color tokens — light & dark](#2-color-tokens--light--dark)
3. [Brand / auth palette (hex)](#3-brand--auth-palette-hex)
4. [Chart colors](#4-chart-colors)
5. [Sidebar tokens](#5-sidebar-tokens)
6. [Font sizes (responsive)](#6-font-sizes-responsive)
7. [Line heights (responsive)](#7-line-heights-responsive)
8. [Radius & breakpoints](#8-radius--breakpoints)
9. [Known gaps & inconsistencies](#9-known-gaps--inconsistencies)
10. [Usage patterns & examples](#10-usage-patterns--examples)

---

## 1. How tokens are wired

`app/globals.css` defines raw HSL triplets as CSS variables under `:root` (light) and `.dark`
(dark). `tailwind.config.js` wraps them: `colors.primary = 'hsl(var(--primary))'`, etc. So:

- **Colors:** use the Tailwind class (`bg-primary`, `text-muted-foreground`). For raw use (charts,
  inline styles) use `hsl(var(--token))`.
- **Dark mode** is `class`-based (`darkMode: ['class']`) — toggling `.dark` on a parent swaps values.
- **Fonts/line-heights:** the CSS variables are remapped onto Tailwind's `fontSize` / `lineHeight`
  scales, so `text-2xl` and `leading-title-3` resolve to the responsive tokens (no bundled
  line-height on the font tokens — pair them).

Every color token has a paired `*-foreground` for accessible text on top of it. Always use the pair
(`bg-primary text-primary-foreground`).

---

## 2. Color tokens — light & dark

Values are `H S% L%` exactly as in `app/globals.css`. "≈hex" is an approximation for orientation only.

| Token | Light (`:root`) | Dark (`.dark`) | ≈hex (light) | Intended use |
|---|---|---|---|---|
| `background` | `0 0% 100%` | `222.2 84% 4.9%` | `#FFFFFF` | app/page background |
| `foreground` | `222.2 84% 4.9%` | `210 40% 98%` | `#020817` | primary text |
| `card` | `0 0% 100%` | `222.2 84% 4.9%` | `#FFFFFF` | card surface |
| `card-foreground` | `222.2 84% 4.9%` | `210 40% 98%` | `#020817` | text on cards |
| `popover` | `0 0% 100%` | `222.2 84% 4.9%` | `#FFFFFF` | popovers/menus |
| `popover-foreground` | `222.2 84% 4.9%` | `210 40% 98%` | `#020817` | text in popovers |
| `primary` | `206 60.2% 31.6%` | `161.4 38.7% 71%` | `#205781` | primary buttons, brand actions (note: **mint** in dark) |
| `primary-foreground` | `210 40% 98%` | `206 60.2% 31.6%` | `#F8FAFC` | text on primary |
| `secondary` | `186.2 33.1% 46.3%` | `186.2 33.1% 46.3%` | `#4F9C9C` | secondary actions (muted teal) |
| `secondary-foreground` | `210 40% 98%` | `210 40% 98%` | `#F8FAFC` | text on secondary |
| `muted` | `210 40% 96%` | `217.2 32.6% 17.5%` | `#F1F5F9` | subtle backgrounds, disabled |
| `muted-foreground` | `215.4 16.3% 46.9%` | `215 20.2% 65.1%` | `#64748B` | secondary/caption text |
| `accent` | `161.4 38.7% 71%` | `206 60.2% 31.6%` | `#98D2C0` | highlights, hover accents (**blue** in dark) |
| `accent-foreground` | `206 60.2% 31.6%` | `210 40% 98%` | `#205781` | text on accent |
| `destructive` | `0 84.2% 60.2%` | `0 84.2% 60.2%` | `#EF4444` | errors, **expenses**, destructive actions |
| `destructive-foreground` | `210 40% 98%` | `210 40% 98%` | `#F8FAFC` | text on destructive |
| `success` | `142 76% 36%` | `142 71% 45%` | `#16A34A` | **income**, positive deltas, success |
| `success-foreground` | `355.7 100% 97.3%` | `144.9 80.4% 10%` | `#FFF1F2` | text on success |
| `warning` | ⚠ **(undefined)** | `48 96% 53%` | `#FACC15` (dark) | warnings — **light-mode value missing** |
| `warning-foreground` | ⚠ **(undefined)** | `26 83% 14%` | — | text on warning (dark only) |
| `border` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | `#E2E8F0` | borders, dividers |
| `input` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` | `#E2E8F0` | input borders |
| `ring` | `206 60.2% 31.6%` | `161.4 38.7% 71%` | `#205781` | focus rings |

> The light↔dark **swap of `primary` and `accent`** is intentional: the brand blue leads in light
> mode, the mint leads in dark mode. Keep using the semantic name (`primary`) — it resolves correctly
> per theme. Don't hardcode the blue expecting it in dark mode.

---

## 3. Brand / auth palette (hex)

Auth pages (`app/(auth)/**`) use a dedicated hardcoded palette via the `auth.*` Tailwind tokens
(`tailwind.config.js`). These are the literal brand hexes; see `PRODUCT_REQUIREMENTS.md` for usage.

| Tailwind token | Hex | Role |
|---|---|---|
| `auth-sidebar` | `#205781` | deep blue — auth sidebar bg (= semantic `primary`) |
| `auth-sidebar-foreground` | `#FFFFFF` | text on sidebar |
| `auth-card` | `#F6F8D5` | pale yellow — auth card bg |
| `auth-card-foreground` | `#205781` | text on card |
| `auth-accent` | `#98D2C0` | mint — accents (= semantic `accent`) |
| `auth-accent-foreground` | `#205781` | text on accent |

**Brand identity = `#205781` deep blue + `#98D2C0` mint + `#F6F8D5` pale yellow.** Outside auth,
prefer the semantic tokens (`primary`/`accent`) so theming works.

---

## 4. Chart colors

Use only for data visualization: `hsl(var(--chart-1))` … `hsl(var(--chart-5))` (or Tailwind
`text-chart-1`, `fill-chart-2`, etc.). Distinct palettes per theme.

| Token | Light | Dark |
|---|---|---|
| `chart-1` | `212.79, 100%, 66.84%` | `214.28, 96.22%, 92.78%` |
| `chart-2` | `173 58% 39%` | `160 60% 45%` |
| `chart-3` | `197 37% 24%` | `30 80% 55%` |
| `chart-4` | `43 74% 66%` | `280 65% 60%` |
| `chart-5` | `27 87% 67%` | `340 75% 55%` |

Default user categories are seeded with `hsl(var(--chart-N))` color strings (see
`docs/architecture/01-data-model.md`) — these resolve only in the browser; never parse them server-side.

---

## 5. Sidebar tokens

For the app navigation/sidebar surfaces: `sidebar` (DEFAULT bg), `sidebar-foreground`,
`sidebar-primary`(+`-foreground`), `sidebar-accent`(+`-foreground`), `sidebar-border`, `sidebar-ring`.

| Token | Light | Dark |
|---|---|---|
| `sidebar` (background) | `0 0% 98%` | `240 5.9% 10%` |
| `sidebar-foreground` | `240 5.3% 26.1%` | `240 4.8% 95.9%` |
| `sidebar-primary` | `206 60.2% 31.6%` | `161.4 38.7% 71%` |
| `sidebar-primary-foreground` | `0 0% 98%` | `206 60.2% 31.6%` |
| `sidebar-accent` | `161.4 38.7% 71%` | `206 60.2% 31.6%` |
| `sidebar-accent-foreground` | `206 60.2% 31.6%` | `240 4.8% 95.9%` |
| `sidebar-border` | `220 13% 91%` | `240 3.7% 15.9%` |
| `sidebar-ring` | `217.2 91.2% 59.8%` | `217.2 91.2% 59.8%` |

Tailwind classes: `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-primary`, etc.

---

## 6. Font sizes (responsive)

Mobile-first, with `sm:` (≥640px) and `lg:` (≥1024px) overrides baked into the CSS variable
(you don't add breakpoints yourself — the token scales). Use the Tailwind class `text-{token}`.

| Class / token | Mobile (<640) | Tablet (≥640) | Desktop (≥1024) |
|---|---|---|---|
| `text-xs` / `--font-size-xs` | 12px | 12px | 12px |
| `text-sm` / `--font-size-sm` | 14px | 14px | 14px |
| `text-md` / `--font-size-md` | 16px | 16px | 16px |
| `text-lg` / `--font-size-lg` | 16px | 17px | 18px |
| `text-xl` / `--font-size-xl` | 18px | 20px | 20px |
| `text-2xl` / `--font-size-2xl` | 20px | 22px | 24px |
| `text-3xl` / `--font-size-3xl` | 24px | 28px | 32px |
| `text-4xl` / `--font-size-4xl` | 32px | 40px | 48px |

The arbitrary-value form `text-[length:var(--font-size-2xl)]` is equivalent but verbose; the utility
class is the live convention. `text-base` is **not** part of this scale (it stays Tailwind's default
16px) — prefer `text-md`.

---

## 7. Line heights (responsive)

Font-size tokens carry **no** line-height — always pair a `text-*` with a `leading-*`. Titles scale
across breakpoints; body/caption are constant.

| Class / token | Mobile | Tablet (≥640) | Desktop (≥1024) | Pair with |
|---|---|---|---|---|
| `leading-title-1` / `--leading-title-1` | 40px | 48px | 56px | `text-4xl` |
| `leading-title-2` / `--leading-title-2` | 32px | 36px | 40px | `text-3xl` |
| `leading-title-3` / `--leading-title-3` | 28px | 30px | 32px | `text-2xl` |
| `leading-title-4` / `--leading-title-4` | 24px | 26px | 28px | `text-xl` |
| `leading-title-5` / `--leading-title-5` | 24px | 26px | 28px | `text-xl`/`text-lg` |
| `leading-body-lg` / `--leading-body-lg` | 24px | 24px | 24px | `text-lg`/`text-md` |
| `leading-body-sm` / `--leading-body-sm` | 20px | 20px | 20px | `text-sm` |
| `leading-caption` / `--leading-caption` | 20px | 20px | 20px | `text-xs` |

---

## 8. Radius & breakpoints

**Radius** (from `--radius: 0.5rem`): `rounded-sm` = `calc(radius - 4px)` = 4px · `rounded-md` =
`calc(radius - 2px)` = 6px · `rounded-lg` = `radius` = 8px.

**Breakpoints** (Tailwind defaults; design-system overrides target these):
- Mobile: 0–639px (default `:root`) — target iPhone SE 375 → 16 Pro Max 430.
- Tablet: 640–1023px (`sm:`) — iPad Mini 744 → iPad Pro 1024.
- Desktop: ≥1024px (`lg:`) — laptops/monitors.

---

## 9. Known gaps & inconsistencies

Document-and-fix-when-touched, not gospel:

1. **`--warning` missing in light mode.** Only defined in `.dark`. `bg-warning`/`text-warning` render
   colorless in light mode. To use a light-mode warning, add `--warning` (+ `--warning-foreground`)
   to `:root` in `app/globals.css` first.
2. **`--chart-1` uses comma syntax** (`212.79, 100%, 66.84%`) while every other token uses
   space-separated HSL. It works wrapped in `hsl()`, but if you compute on it, account for commas.
3. **No explicit `info` token.** For informational accents use `primary`/`accent` or a `chart-*`.
4. **Hardcoded `auth.*` hexes** don't theme (no dark variants). That's intentional for the auth
   brand wall, but don't reuse `auth.*` outside `app/(auth)/**`.

---

## 10. Usage patterns & examples

**Do**
```tsx
// Semantic tokens, paired font+leading, lucide icon, cn() for conditional color
import { cn } from '@/lib/utils'
import { ArrowDownRight } from 'lucide-react'

<button className="rounded-md bg-primary px-4 py-2 text-sm leading-body-sm text-primary-foreground
                   hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring">
  {t('save')}
</button>

<span className={cn('text-md leading-body-lg', amount < 0 ? 'text-destructive' : 'text-success')}>
  <ArrowDownRight className="size-4" /> {formatCurrency(Math.abs(amount))}
</span>
```

**Don't**
```tsx
// ❌ hardcoded color → breaks dark mode + global theming
<p className="text-red-600">Over budget</p>
// ❌ arbitrary px → ignores responsive scale
<h2 className="text-[22px] leading-[30px]">Spending</h2>
// ❌ emoji instead of lucide icon
<span>💰 {balance}</span>
// ❌ warning token in light mode → renders colorless
<div className="bg-warning text-warning-foreground">Heads up</div>
```

**Chart series** (raw HSL):
```tsx
<Bar dataKey="spent" fill="hsl(var(--chart-1))" />
<Bar dataKey="budget" fill="hsl(var(--muted))" />
```

**Finance color rule:** income/positive → `success`; expense/negative → `destructive`. Keep it
consistent across amounts, deltas, and chart legends so users learn the color language once.
