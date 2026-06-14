# MoneyFlow Mobile — Design System (Pencil source)

> Extracted from `designs/spending-page.pen`, frame **"DESIGN SYSTEM — DEV REFERENCE"** (node
> `mGQZc`). Snapshot: 2026-06-12. This is the **design spec for the mobile screens** (onboarding +
> app). The .pen file is the source of truth — when this doc disagrees with the design, re-extract.
>
> ✅ **Core palette adopted into `app/globals.css` on 2026-06-12**: `primary` = `#20507F`,
> `background` = `#EEF2F7`, `foreground` = `#0F172A` (cards stay white); PWA `theme_color`, auth
> tokens, and the maskable icon were updated too. The hero gradient, shadows, selected state, and
> category tints were tokenized later the same day (mobile-visual-foundations); only Goal Pill and
> Rating Star remain design-only — see
> [§ Deltas vs implemented tokens](#deltas-vs-implemented-code-tokens) before hardcoding anything.

**Basics:** Font **Inter** · Icons **lucide-react** · Base unit **4px** · Screen width **390**.

---

## 1. Colors

### Brand & surfaces

| Name | Hex | Use |
|---|---|---|
| Primary | `#20507F` | primary buttons, selected states, links |
| Navy Deep | `#0D253D` | hero gradient start, darkest brand |
| Navy Light | `#1D5499` | hero gradient end |
| Mint Accent | `#98D2C0` | brand accent (matches code `accent`) |
| Selected Tint | `#EBF3FD` | selected-item backgrounds, blue icon-tint bg |
| On-Navy Muted | `#BFD7EA` | secondary text/icons on navy surfaces |
| Chart Bar | `#3D6F9E` | bar-chart fills |
| Background | `#EEF2F7` | page/screen background |
| Surface | `#FFFFFF` | cards, inputs, sheets |

### Text & neutrals

| Name | Hex | Use |
|---|---|---|
| Text Primary | `#0F172A` | headings, primary text |
| Text Strong | `#1E293B` | strong body text |
| Form Label | `#334155` | input labels |
| Text Secondary | `#64748B` | secondary/caption text (= code `muted-foreground`) |
| Placeholder | `#94A3B8` | input placeholders, eyebrows |
| Disabled / Dots | `#CBD5E1` | disabled, inactive step dots |
| Border | `#E2E8F0` | borders (= code `border`) |
| Divider | `#F1F5F9` | hairline dividers, subtle fills |

### Semantic

| Name | Hex | Use |
|---|---|---|
| Success | `#16A34A` | income, positive (= code `success`) |
| Success Tint | `#F0FDF4` | success backgrounds |
| Danger | `#EF4444` | expense, errors (= code `destructive`) |
| Danger Tint | `#FEF2F2` | danger backgrounds |
| Rating Star | `#F59E0B` | star ratings |
| Goal Pill Teal | `#0F766E` | goal pills FG |
| Goal Pill Tint | `#E5F4EE` | goal pills BG |
| Google Blue | `#4285F4` | Google social button only |

### Gradient & shadows

- **Hero gradient:** linear **135°**, `#0D253D → #1D5499` (gradient hero cards, headers).
- **Card shadow:** `0 2 10 · #0F172A0D` (cards on `#EEF2F7` bg).
- **Floating shadow:** `0 4 20 · #0F172A25` (floating tab bar, FAB).

### Category icon tints (FG on BG pairs)

44px circles (r22) behind 16–22px lucide icons:

| Tint | FG | BG |
|---|---|---|
| Blue | `#20507F` | `#EBF3FD` |
| Green | `#16A34A` | `#F0FDF4` |
| Orange | `#EA580C` | `#FFF7ED` |
| Pink | `#DB2777` | `#FDF2F8` |
| Teal | `#2E8C72` | `#E8F6F1` |
| Purple | `#6D4FC2` | `#F1EDFB` |
| Slate | `#64748B` | `#F1F5F9` |

---

## 2. Typography — Inter

| Role | Size / weight | Use |
|---|---|---|
| Display | 30 / Bold | amount entry display |
| Headline L | 28 / Bold | result hero amount |
| Headline | 26 / Bold | hero headline, net-worth amount |
| Title | 24 / Bold | screen & question titles |
| Input Value | 18 / Bold | filled input values, wordmark |
| Section | 17 / Bold | section headings |
| Button | 16 / SemiBold | CTA labels (inside 52px button) |
| Card Title | 15 / SemiBold | card/list titles, social buttons |
| Body | 14 / Regular | body copy, row labels (500/600 for emphasis) |
| Caption | 13 / Reg·SemiBold | chips, links, footers |
| Micro | 12 / Regular | microcopy, badges, helper text |
| Tiny | 11 / SemiBold | pills, tab labels, eyebrows |

> This scale is the **design spec**; in code keep using the responsive `text-*` + `leading-*`
> tokens and pick the nearest (e.g. Title 24 → `text-3xl leading-title-2`, Body 14 → `text-sm
> leading-body-sm`). Don't introduce arbitrary px.

---

## 3. Iconography — lucide-react

- **Sizes:** 13–14 inline · 16–22 standard UI · 30–38 hero badges.
- Stroke icons only, **never emojis**. Tinted circles use the FG/BG pairs above.
- Vocabulary used by the mobile designs:
  - *System & navigation:* `chevron-left`, `arrow-right`, `plus`, `check`, `circle`,
    `circle-check`, `eye`, `lock`, `pencil`, `ellipsis`, `signal`, `wifi`, `battery-full`,
    `scan-face`
  - *Brand & features:* `wallet`, `sparkles`, `trending-up`, `scan-line`, `chart-pie`, `target`,
    `heart-pulse`, `message-circle`, `trophy`, `party-popper`, `lightbulb`, `calculator`, `star`,
    `shield-check`
  - *Goals & categories:* `shield`, `plane`, `smartphone`, `credit-card`, `house`, `utensils`,
    `car`, `briefcase`, `scissors`

---

## 4. Core controls

| Control | Spec |
|---|---|
| Primary button | h52 · r14 · fill `#20507F` · label 16/SemiBold white |
| Secondary button | h52 · r14 · stroke 1.5 `#20507F` on `#EEF2F7` |
| Choice chip | r999 · pad 10×18 · 13px; selected = `#20507F` fill, default = white + `#E2E8F0` border |
| Text input | h52 · r14 · border `#E2E8F0` → focus `#20507F` 2px · white fill, pad-x 16 |
| Step progress | 7×7 dots r4, active pill 22×7 `#20507F`, inactive `#CBD5E1`, gap 6 |

---

## § Category styling

Import `getCategoryIcon(name)` and `getCategoryTint(name)` from `lib/category-style.ts` — never
hand-pick per-category colors or icons.

- `getCategoryIcon(name)` returns the matching Lucide icon component (or `Tag` as fallback). Render
  as `const Icon = getCategoryIcon(cat.name); <Icon className="size-5" />`. **Caveat:** the
  `const Icon = getCategoryIcon(...)` render-alias pattern may trip the `react-hooks/static-components`
  lint rule (it looks like a component defined inside a render function). If it fires, wrap in a
  small `<CategoryIcon name={...} />` component instead of disabling the rule.
- `getCategoryTint(name)` returns a `{ bg, fg }` pair of **complete class strings** (e.g.
  `{ bg: 'bg-tint-blue-bg', fg: 'text-tint-blue-fg' }`). Apply via `cn(tint.bg, tint.fg)` on the
  icon circle. Never interpolate tint class names (`bg-tint-${key}-bg`) — Tailwind's scanner
  can't see interpolated classes and the CSS won't be generated.
- Both functions are name-based (not id-based) so they work before and after DB hydration.

---

## 5. Layout tokens

- **Radii:** 10 small chips · 12–13 icon bubbles · 14 buttons & inputs · 16 cards · 20 hero cards ·
  999 pills/chips.
- **Spacing:** screen padding 20 · section gap 20–24 · card padding 14–18 · list row 12–14 · base
  grid 4px.
- **Screen:** width 390 · bg `#EEF2F7` · status bar h62 · CTA h52 full-width · gradient heroes 135°.

---

## Deltas vs implemented code tokens

Status after the 2026-06-12 token adoption:

| Design value | Code token | Status |
|---|---|---|
| Primary `#20507F` | `primary` (`209.7 59.7% 31.2%`) | ✓ adopted (replaced `#205781`) |
| Background `#EEF2F7` | `background` (`213.3 36% 95.1%`) | ✓ adopted (cards stay white via `card`) |
| Text Primary `#0F172A` | `foreground` (`222.2 47.4% 11.2%`) | ✓ adopted |
| Surface `#FFFFFF` | `card` / `popover` | ✓ matches |
| Mint `#98D2C0` | `accent` | ✓ matches |
| Border `#E2E8F0` | `border` / `input` | ✓ matches |
| Success `#16A34A` / Danger `#EF4444` | `success` / `destructive` | ✓ match |
| Divider `#F1F5F9` | `muted` | ✓ matches |
| Text Secondary `#64748B` | `muted-foreground` | ✓ matches |
| Navy Deep/Light gradient `#0D253D→#1D5499` | `bg-hero-gradient` + `hero-{from,to,foreground,muted,success,danger}` | ✓ adopted 2026-06-12 |
| Selected/Success/Danger/category tints | `selected` token + `tint-{blue,green,orange,pink,teal,purple,slate,amber}-{fg,bg}` pairs | ✓ adopted 2026-06-12 (amber added from the Transactions mockup; success/danger tints stay opacity-on-token) |
| On-Navy Muted `#BFD7EA`, Chart Bar `#3D6F9E` | `hero-muted`, `chart-bar` | ✓ adopted 2026-06-12 |
| Card / floating shadows | `shadow-card`, `shadow-floating` | ✓ adopted 2026-06-12 (dark: border-ring / deeper shadow) |
| Goal Pill, Rating Star | — | no dedicated tokens yet |
| Type scale 11–30 Inter | `text-xs`…`text-4xl` responsive tokens | design sizes don't map 1:1; use nearest token |

**Rule of thumb:** where a semantic token matches the design value, use the token. Where it
doesn't, don't silently hardcode hex — either extend `app/globals.css` (+ this doc + the token
tables) or raise the mismatch.