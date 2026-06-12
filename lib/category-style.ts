import {
  Utensils, Car, ShoppingBag, Clapperboard, Receipt, HeartPulse,
  GraduationCap, Plane, Briefcase, ArrowLeftRight, PiggyBank, CreditCard, Coffee, Tag,
  type LucideIcon,
} from 'lucide-react'

// Keyword → icon, first match wins. Keywords are lowercase substrings (EN + ID).
// Order matters: more specific entries (coffee, savings, credit card) before general ones.
const ICON_RULES: Array<[string[], LucideIcon]> = [
  [['coffee', 'kopi'], Coffee],
  [['saving', 'tabungan'], PiggyBank],
  [['credit card', 'kartu kredit'], CreditCard],
  [['food', 'dining', 'makan'], Utensils],
  [['transport', 'grab', 'gojek'], Car],
  [['shopping', 'belanja'], ShoppingBag],
  [['entertain', 'hiburan'], Clapperboard],
  [['bill', 'utilit', 'tagihan'], Receipt],
  [['health', 'kesehatan', 'medical'], HeartPulse],
  [['education', 'pendidikan'], GraduationCap],
  [['travel', 'perjalanan', 'liburan'], Plane],
  [['income', 'salary', 'gaji'], Briefcase],
  [['transfer'], ArrowLeftRight],
]

export function getCategoryIcon(categoryName: string | null | undefined): LucideIcon {
  const name = categoryName?.toLowerCase() ?? ''
  if (!name) return Tag
  for (const [keywords, icon] of ICON_RULES) {
    if (keywords.some((k) => name.includes(k))) return icon
  }
  return Tag
}

export interface CategoryTint {
  bg: string
  fg: string
}

// Literal class strings — Tailwind's scanner must see these verbatim.
export const CATEGORY_TINTS: CategoryTint[] = [
  { bg: 'bg-tint-blue-bg', fg: 'text-tint-blue-fg' },
  { bg: 'bg-tint-green-bg', fg: 'text-tint-green-fg' },
  { bg: 'bg-tint-orange-bg', fg: 'text-tint-orange-fg' },
  { bg: 'bg-tint-pink-bg', fg: 'text-tint-pink-fg' },
  { bg: 'bg-tint-teal-bg', fg: 'text-tint-teal-fg' },
  { bg: 'bg-tint-purple-bg', fg: 'text-tint-purple-fg' },
  { bg: 'bg-tint-slate-bg', fg: 'text-tint-slate-fg' },
  { bg: 'bg-tint-amber-bg', fg: 'text-tint-amber-fg' },
]

const TINT_BY_NAME: Record<string, CategoryTint> = {
  blue: CATEGORY_TINTS[0], green: CATEGORY_TINTS[1], orange: CATEGORY_TINTS[2],
  pink: CATEGORY_TINTS[3], teal: CATEGORY_TINTS[4], purple: CATEGORY_TINTS[5],
  slate: CATEGORY_TINTS[6], amber: CATEGORY_TINTS[7],
}

// Keyword → tint, first match wins (EN + ID), mirroring ICON_RULES ordering.
const TINT_RULES: Array<[string[], CategoryTint]> = [
  [['coffee', 'kopi'], TINT_BY_NAME.amber],
  [['saving', 'tabungan'], TINT_BY_NAME.teal],
  [['credit card', 'kartu kredit'], TINT_BY_NAME.blue],
  [['food', 'dining', 'makan'], TINT_BY_NAME.amber],
  [['transport', 'grab', 'gojek'], TINT_BY_NAME.blue],
  [['shopping', 'belanja'], TINT_BY_NAME.pink],
  [['entertain', 'hiburan'], TINT_BY_NAME.purple],
  [['bill', 'utilit', 'tagihan'], TINT_BY_NAME.slate],
  [['health', 'kesehatan', 'medical'], TINT_BY_NAME.green],
  [['education', 'pendidikan'], TINT_BY_NAME.purple],
  [['travel', 'perjalanan', 'liburan'], TINT_BY_NAME.teal],
  [['income', 'salary', 'gaji'], TINT_BY_NAME.green],
  [['transfer'], TINT_BY_NAME.slate],
]

// djb2 — stable across sessions, no Math.random.
function hashName(name: string): number {
  let hash = 5381
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i)
  }
  return Math.abs(hash)
}

export function getCategoryTint(categoryName: string | null | undefined): CategoryTint {
  const name = categoryName?.toLowerCase() ?? ''
  if (!name) return TINT_BY_NAME.slate
  for (const [keywords, tint] of TINT_RULES) {
    if (keywords.some((k) => name.includes(k))) return tint
  }
  return CATEGORY_TINTS[hashName(name) % CATEGORY_TINTS.length]
}
