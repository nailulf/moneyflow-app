import {
  ShieldCheck, Plane, Home, Car, GraduationCap, Heart,
  TrendingUp, Smartphone, Landmark, Target,
  type LucideIcon,
} from 'lucide-react'

export interface GoalTint {
  bg: string
  fg: string
}

// Literal class strings — Tailwind's scanner must see these verbatim.
// Scanned because tailwind.config.js content includes './lib/**/*.{js,ts,jsx,tsx}'.
const TINT = {
  red:    { bg: 'bg-tint-pink-bg',   fg: 'text-tint-pink-fg' },
  blue:   { bg: 'bg-tint-blue-bg',   fg: 'text-tint-blue-fg' },
  green:  { bg: 'bg-tint-green-bg',  fg: 'text-tint-green-fg' },
  orange: { bg: 'bg-tint-orange-bg', fg: 'text-tint-orange-fg' },
  pink:   { bg: 'bg-tint-pink-bg',   fg: 'text-tint-pink-fg' },
  teal:   { bg: 'bg-tint-teal-bg',   fg: 'text-tint-teal-fg' },
  purple: { bg: 'bg-tint-purple-bg', fg: 'text-tint-purple-fg' },
  slate:  { bg: 'bg-tint-slate-bg',  fg: 'text-tint-slate-fg' },
  amber:  { bg: 'bg-tint-amber-bg',  fg: 'text-tint-amber-fg' },
} satisfies Record<string, GoalTint>

// goal_type → [icon, tint]. Default for unknown types is Target / slate.
const GOAL_STYLE: Record<string, [LucideIcon, GoalTint]> = {
  emergency_fund:     [ShieldCheck,   TINT.red],
  vacation:           [Plane,         TINT.blue],
  house_down_payment: [Home,          TINT.green],
  car_purchase:       [Car,           TINT.orange],
  education:          [GraduationCap, TINT.purple],
  wedding:            [Heart,         TINT.pink],
  investment:         [TrendingUp,    TINT.teal],
  gadget:             [Smartphone,    TINT.amber],
  debt_payoff:        [Landmark,      TINT.slate],
  other:              [Target,        TINT.slate],
}

const DEFAULT: [LucideIcon, GoalTint] = [Target, TINT.slate]

export function goalIcon(goalType: string): LucideIcon {
  return (GOAL_STYLE[goalType] ?? DEFAULT)[0]
}

export function goalTint(goalType: string): GoalTint {
  return (GOAL_STYLE[goalType] ?? DEFAULT)[1]
}
