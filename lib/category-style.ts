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
