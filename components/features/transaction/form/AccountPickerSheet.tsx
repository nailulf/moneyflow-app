'use client'

import { useState } from 'react'
import {
  Landmark,
  Wallet,
  CreditCard,
  Smartphone,
  TrendingUp,
  Home,
  Car,
  Building2,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/organisms/sheet'

// ---------------------------------------------------------------------------
// Minimal account shape — subset used by the picker
// ---------------------------------------------------------------------------
export interface PickerAccount {
  id: string
  name: string
  type: string
  balance: number
  currency: string
}

export interface AccountPickerSheetProps {
  open: boolean
  title: string
  accounts: PickerAccount[]
  selectedId: string | null
  excludeId?: string | null
  onSelect: (id: string) => void
  onOpenChange: (open: boolean) => void
}

// ---------------------------------------------------------------------------
// Account-type → icon + tint (reuses the same tint token system as categories)
// ---------------------------------------------------------------------------
interface AccountStyle {
  Icon: LucideIcon
  bg: string
  fg: string
}

const ACCOUNT_STYLES: Record<string, AccountStyle> = {
  BANK:           { Icon: Landmark,   bg: 'bg-tint-blue-bg',   fg: 'text-tint-blue-fg' },
  CREDIT_CARD:    { Icon: CreditCard, bg: 'bg-tint-slate-bg',  fg: 'text-tint-slate-fg' },
  CASH:           { Icon: Wallet,     bg: 'bg-tint-green-bg',  fg: 'text-tint-green-fg' },
  DIGITAL_WALLET: { Icon: Smartphone, bg: 'bg-tint-teal-bg',   fg: 'text-tint-teal-fg' },
  INVESTMENT:     { Icon: TrendingUp, bg: 'bg-tint-purple-bg', fg: 'text-tint-purple-fg' },
  PROPERTY:       { Icon: Home,       bg: 'bg-tint-amber-bg',  fg: 'text-tint-amber-fg' },
  VEHICLE:        { Icon: Car,        bg: 'bg-tint-orange-bg', fg: 'text-tint-orange-fg' },
  MORTGAGE:       { Icon: Building2,  bg: 'bg-tint-slate-bg',  fg: 'text-tint-slate-fg' },
}

const DEFAULT_STYLE: AccountStyle = {
  Icon: Wallet,
  bg: 'bg-tint-slate-bg',
  fg: 'text-tint-slate-fg',
}

function getAccountStyle(type: string): AccountStyle {
  return ACCOUNT_STYLES[type] ?? DEFAULT_STYLE
}

// Human-readable label per type (EN baseline — parent can i18n-ify via title prop)
function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    BANK:           'Bank account',
    CREDIT_CARD:    'Credit card',
    CASH:           'Cash wallet',
    DIGITAL_WALLET: 'Digital wallet',
    INVESTMENT:     'Investment',
    PROPERTY:       'Property',
    VEHICLE:        'Vehicle',
    MORTGAGE:       'Mortgage',
  }
  return labels[type] ?? type
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AccountPickerSheet({
  open,
  title,
  accounts,
  selectedId,
  excludeId,
  onSelect,
  onOpenChange,
}: AccountPickerSheetProps) {
  const [search, setSearch] = useState('')

  const filtered = accounts
    .filter((a) => a.id !== excludeId)
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))

  const handleSelect = (id: string) => {
    onSelect(id)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {/* Search input */}
        <div className="px-4 py-3">
          <input
            type="text"
            placeholder="Search accounts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full rounded-md border border-input bg-transparent px-3 py-2',
              'text-md leading-body-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            )}
          />
        </div>

        {/* Account list */}
        <div className="flex-1 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="flex flex-col gap-1">
            {filtered.map((acct) => {
              const { Icon, bg, fg } = getAccountStyle(acct.type)
              const isSelected = acct.id === selectedId

              return (
                <button
                  key={acct.id}
                  type="button"
                  onClick={() => handleSelect(acct.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-3 text-left',
                    'hover:bg-muted/50 active:bg-muted transition-colors',
                    isSelected && 'ring-2 ring-primary',
                  )}
                >
                  {/* Account-type icon circle */}
                  <span
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-full',
                      bg,
                    )}
                  >
                    <Icon className={cn('size-5', fg)} />
                  </span>

                  {/* Name + type */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-body-sm font-medium text-foreground truncate">
                      {acct.name}
                    </p>
                    <p className="text-xs leading-caption text-muted-foreground">
                      {typeLabel(acct.type)}
                    </p>
                  </div>

                  {/* Right: balance + optional check */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm leading-body-sm text-foreground tabular-nums">
                      {acct.balance.toLocaleString()} {acct.currency}
                    </span>
                    {isSelected && (
                      <Check className="size-4 text-primary" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
