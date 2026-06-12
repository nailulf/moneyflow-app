import {
  Utensils, Car, ShoppingBag, Clapperboard, Receipt, HeartPulse,
  GraduationCap, Plane, Briefcase, ArrowLeftRight, PiggyBank, CreditCard, Coffee, Tag,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

export interface CategoryTint {
  bg: string
  fg: string
}

// Literal class strings — Tailwind's scanner must see these verbatim.
// Scanned because tailwind.config.js content includes './lib/**/*.{js,ts,jsx,tsx}'.
const TINT = {
  blue:   { bg: 'bg-tint-blue-bg',   fg: 'text-tint-blue-fg' },
  green:  { bg: 'bg-tint-green-bg',  fg: 'text-tint-green-fg' },
  orange: { bg: 'bg-tint-orange-bg', fg: 'text-tint-orange-fg' },
  pink:   { bg: 'bg-tint-pink-bg',   fg: 'text-tint-pink-fg' },
  teal:   { bg: 'bg-tint-teal-bg',   fg: 'text-tint-teal-fg' },
  purple: { bg: 'bg-tint-purple-bg', fg: 'text-tint-purple-fg' },
  slate:  { bg: 'bg-tint-slate-bg',  fg: 'text-tint-slate-fg' },
  amber:  { bg: 'bg-tint-amber-bg',  fg: 'text-tint-amber-fg' },
} satisfies Record<string, CategoryTint>

// Keyword → (icon, tint), first match wins (EN + ID).
// Order matters: more specific entries (coffee, savings, credit card) before general ones.
const CATEGORY_RULES: Array<[string[], LucideIcon, CategoryTint]> = [
  // Uncategorized sentinel labels (EN/ID) stay neutral regardless of locale.
  [['uncategorized', 'tanpa kategori'], Tag,       TINT.slate],
  [['coffee', 'kopi'],              Coffee,        TINT.amber],
  [['saving', 'tabungan'],          PiggyBank,     TINT.teal],
  [['credit card', 'kartu kredit'], CreditCard,    TINT.blue],
  [['food', 'dining', 'makan'],     Utensils,      TINT.amber],
  [['transport', 'grab', 'gojek'],  Car,           TINT.blue],
  [['shopping', 'belanja'],         ShoppingBag,   TINT.pink],
  [['entertain', 'hiburan'],        Clapperboard,  TINT.purple],
  [['bill', 'utilit', 'tagihan'],   Receipt,       TINT.slate],
  [['health', 'kesehatan', 'medical'], HeartPulse, TINT.green],
  [['education', 'pendidikan'],     GraduationCap, TINT.purple],
  [['travel', 'perjalanan', 'liburan'], Plane,     TINT.teal],
  [['invest', 'investasi'],         TrendingUp,    TINT.green],
  [['income', 'salary', 'gaji'],    Briefcase,     TINT.green],
  [['transfer'],                    ArrowLeftRight, TINT.slate],
]

// Hash-fallback order for unknown names (orange is only reachable via this fallback).
export const CATEGORY_TINTS: CategoryTint[] = [
  TINT.blue, TINT.green, TINT.orange, TINT.pink,
  TINT.teal, TINT.purple, TINT.slate, TINT.amber,
]

// djb2 — stable across sessions, no Math.random.
function hashName(name: string): number {
  let hash = 5381
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i)
  }
  return Math.abs(hash)
}

function findRule(name: string): [string[], LucideIcon, CategoryTint] | undefined {
  return CATEGORY_RULES.find(([keywords]) => keywords.some((k) => name.includes(k)))
}

export function getCategoryIcon(categoryName: string | null | undefined): LucideIcon {
  const name = categoryName?.toLowerCase() ?? ''
  if (!name) return Tag
  return findRule(name)?.[1] ?? Tag
}

export function getCategoryTint(categoryName: string | null | undefined): CategoryTint {
  const name = categoryName?.toLowerCase() ?? ''
  if (!name) return TINT.slate
  return findRule(name)?.[2] ?? CATEGORY_TINTS[hashName(name) % CATEGORY_TINTS.length]
}
