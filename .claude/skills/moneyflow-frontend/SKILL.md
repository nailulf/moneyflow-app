---
name: moneyflow-frontend
description: >-
  Build and edit MoneyFlow's frontend — React 19 / Next.js 16 components, pages, forms, charts,
  and UI. Use this skill whenever working on ANY UI in this repo: creating or modifying a
  component, styling with Tailwind, wiring data with React Query or Context, adding i18n strings,
  building forms, or implementing mobile-first/responsive layouts. It enforces the project design
  system (semantic color + font tokens, lucide icons, Radix primitives), the data-access patterns,
  next-intl i18n, and form conventions. Trigger even when the user just says "add a card", "style
  this", "build the X page", "make a chart", or "make it responsive" without naming the design
  system explicitly — drifting from these tokens creates inconsistent, un-themeable UI.
---

# MoneyFlow Frontend Developer

You are building UI for **MoneyFlow**, an Indonesia-first personal-finance app (Next.js 16 App
Router, React 19, TypeScript, Tailwind, Radix UI, TanStack Query, next-intl). The team is moving
**mobile-first** (Android via PWA/TWA — see `designs/spending-page.pen` and
[`docs/architecture/`](../../../docs/architecture/README.md)), so design every screen for a 390px
phone first and enhance upward.

This skill keeps your UI on-brand, themeable (light/dark), localized, and consistent with existing
patterns. Follow the golden rules; reach for the reference files when you need exhaustive detail.

## Golden rules (why they matter)

1. **Style with semantic design tokens, never hardcoded colors.** No `text-red-600`, `bg-green-100`,
   or hex codes. Use `text-destructive`, `bg-success/10`, `text-muted-foreground`, etc. Hardcoded
   colors break dark mode and make global theme changes impossible — this was the #1 finding in the
   design-system audit, and 20+ components were refactored to fix it. Don't regress it.
2. **Use the responsive font + line-height tokens**, not Tailwind default sizes or arbitrary px.
   `text-2xl` + `leading-title-3`, not `text-[22px]`. The tokens scale across phone/tablet/desktop
   automatically; raw sizes don't.
3. **Icons are `lucide-react`, never emojis.** Emojis render inconsistently across platforms and
   read as unfinished.
4. **Compose, don't reinvent.** UI primitives live in `components/ui/` (Radix-based). Merge classes
   with `cn()` from `lib/utils.ts`. Import via the `@/` alias.
5. **All user-facing text goes through next-intl** (`useTranslations`). No hardcoded English/Indonesian
   strings in components.
6. **Mobile-first.** Default styles target the phone; add `sm:`/`lg:` to scale up. Tap targets ≥44px.

## Design system

Tokens are HSL CSS variables in `app/globals.css`, exposed as Tailwind utilities in
`tailwind.config.js`. **Full token dump (dark mode, charts, sidebar, examples, known gaps) →
[`references/design-system.md`](references/design-system.md). Read it when you need a value not below.**

**Brand palette:** `#205781` deep blue (`primary` / `auth.sidebar`) · `#98D2C0` mint (`accent`) ·
`#F6F8D5` pale yellow (`auth.card`). Auth pages use the hardcoded `auth.*` tokens; everything else
uses the semantic system, which mirrors the brand.

**Color tokens** (Tailwind class → light `H S% L%` → use). Each has a paired `*-foreground` for text on it:

| Class | Light HSL | Use |
|---|---|---|
| `background` / `foreground` | `0 0% 100%` / `222 84% 4.9%` | page bg / primary text |
| `card`, `popover` | = background | surfaces, dropdowns |
| `primary` | `206 60% 31.6%` | primary buttons, brand actions (`#205781`) |
| `secondary` | `186 33% 46%` | secondary actions (muted teal) |
| `accent` | `161 39% 71%` | highlights, hover accents (`#98D2C0`) |
| `muted` / `muted-foreground` | `210 40% 96%` / `215 16% 47%` | subtle bg / secondary text (`#64748B`) |
| `destructive` | `0 84% 60%` | errors, **expenses**, delete (`#EF4444`) |
| `success` | `142 76% 36%` | **income**, positive deltas, confirmations (`#16A34A`) |
| `warning` | ⚠ **undefined in light mode** | amber in dark only (`#FACC15`) — see gap note below |
| `border` / `input` / `ring` | `214 32% 91%` … | borders, inputs, focus rings (`#E2E8F0`) |
| `chart-1`…`chart-5` | data-viz palette | charts only: `hsl(var(--chart-N))` |

> ⚠ **`warning` is only defined in `.dark`.** Using `bg-warning`/`text-warning` in light mode yields
> no color. If you need a light-mode warning, either add `--warning` to `:root` in `app/globals.css`
> first, or use `destructive`/an explicit `chart-*` token. Don't ship a broken `warning` usage.

**Finance color convention:** income/positive → `success`; expense/negative → `destructive`. Apply
consistently to amounts, deltas, and chart series.

**Font scale** — `text-{token}` (responsive px: phone / tablet≥640 / desktop≥1024). Tokens carry
**no** line-height; always pair with a `leading-*`:

| Class | px (m/t/d) | | `leading-*` | px (m/t/d) |
|---|---|---|---|---|
| `text-xs` | 12/12/12 | | `leading-title-1` | 40/48/56 |
| `text-sm` | 14/14/14 | | `leading-title-2` | 32/36/40 |
| `text-md` | 16/16/16 | | `leading-title-3` | 28/30/32 |
| `text-lg` | 16/17/18 | | `leading-title-4` / `-5` | 24/26/28 |
| `text-xl` | 18/20/20 | | `leading-body-lg` | 24 |
| `text-2xl` | 20/22/24 | | `leading-body-sm` | 20 |
| `text-3xl` | 24/28/32 | | `leading-caption` | 20 |
| `text-4xl` | 32/40/48 | | | |

`border-radius`: `rounded-sm` (4px) · `rounded-md` (6px) · `rounded-lg` (8px, `--radius`).

**Example — a stat card, on-brand and themeable:**
```tsx
import { cn } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

<div className="rounded-lg border border-border bg-card p-4">
  <p className="text-sm leading-body-sm text-muted-foreground">{t('netWorth')}</p>
  <p className="text-2xl leading-title-3 font-semibold text-foreground">{formatCurrency(value)}</p>
  <span className={cn('inline-flex items-center gap-1 text-sm',
    delta >= 0 ? 'text-success' : 'text-destructive')}>
    <TrendingUp className="size-4" /> {formatPercent(delta)}
  </span>
</div>
```

## Components

- **Primitives:** `components/ui/` — Radix-based (button, card, dialog, sheet, dropdown, etc.). Reuse
  and compose these; don't hand-roll buttons/dialogs.
- **Feature components:** `components/[feature].tsx` and `components/features/**`.
- **Class merging:** always `cn(...)` from `lib/utils.ts` (handles Tailwind conflicts + conditionals).
- **Modals/sheets:** there is a modal system — see `docs/MODAL_SYSTEM.md` before building new dialogs.
- Match the structure and naming of nearby components; read a sibling first.

## Data access

Don't fetch in components directly. Use the established layers (full map in
[`docs/architecture/03-api-surface.md`](../../../docs/architecture/03-api-surface.md)):

- **Preferred — React Query hooks** (`hooks/`): `useAllTransactions({ userId })`, `useAccounts`,
  goals/onboarding/forecast hooks, etc. Pagination, caching, and invalidation are handled for you.
- **Context wrappers** (`contexts/`): `useAuth()` for the current user (every data hook needs
  `user.id`), plus `TransactionContext`/`AccountContext`/etc. that wrap React Query for a simpler API.
- **Cache keys & invalidation:** the single source of truth is `hooks/useDataRefresh.ts`
  (`queryKeys` registry). After a mutation, invalidate the right keys — mutations already fan out to
  `transactions` + `net-worth` + `budgets` + `accounts` where relevant.
- **Money:** format with `formatCurrency`/`formatCurrencyCompact` from `lib/data-utils.ts` (IDR-aware:
  `Rb`/`Jt`/`M`). Amounts are stored INCOME-positive / EXPENSE-negative — use `Math.abs` for display.

## Internationalization (next-intl)

Cookie-based, no URL prefix. Messages in `messages/en.json` + `messages/id.json`.

- In components: `const t = useTranslations('namespace')` then `t('key')`; interpolate with
  `t('budgetIn', { period })`. Use `useLocale()` when you need the locale (e.g. `toLocaleString`).
- **Add the key to BOTH `en.json` and `id.json`** — a missing `id` key is a visible bug for the
  Indonesian default audience.
- **Zod + i18n:** define the schema **inside** the component so it can access `t()`, and use the
  **v4 message syntax** `z.string().email({ message: t('key') })` — NOT `.email(t('key'))`.
- Existing namespaces include `auth.*`, `nav`, `layout.pageTitle`, `dashboard.*`. Reuse before adding.

## Forms

React Hook Form + Zod v4 + `@hookform/resolvers`. Validate with a Zod schema (defined in-component
for i18n), render errors from `formState.errors`, and submit through the data-access hooks above.
Mirror an existing form (e.g. `AddTransactionForm`, `EditTransactionForm`) for structure.

## Mobile-first & responsive

- Phone-first: default classes are mobile; layer `sm:` (≥640) and `lg:` (≥1024). The font/line-height
  tokens already scale across these breakpoints — don't fight them with fixed px.
- Reference the mobile designs in `designs/spending-page.pen` (5 core screens + Add-Transaction flows,
  bottom tab bar + center FAB, custom numpad, camera receipt capture).
- Touch targets ≥44px; avoid hover-only affordances; respect safe areas.
- The mobile pivot is the current direction — see the [`mobile-first-pivot` memory] and
  [`docs/architecture/02-auth-sessions-rls.md`](../../../docs/architecture/02-auth-sessions-rls.md)
  for the webview/auth implications if you touch auth or session-dependent UI.

## Before you call it done

- [ ] No hardcoded colors/hex/arbitrary px — only semantic tokens + font/leading tokens.
- [ ] Works in light **and** dark mode (check token has a `.dark` value; beware `warning`).
- [ ] All text via `useTranslations`; keys added to `en.json` **and** `id.json`.
- [ ] `lucide-react` icons, not emojis.
- [ ] Reused `components/ui/` primitives + `cn()`; `@/` imports.
- [ ] Mobile layout verified at ~390px first, then `sm:`/`lg:`.
- [ ] Data via React Query hooks/Context; correct cache invalidation on mutate.
- [ ] `npm run lint` clean.
