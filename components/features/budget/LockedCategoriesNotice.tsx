'use client'

import { createElement } from 'react'
import { useTranslations } from 'next-intl'
import { Lock } from 'lucide-react'
import { InfoBanner } from '@/components/features/accounts/create/InfoBanner'
import { getCategoryIcon, getCategoryTint } from '@/lib/category-style'
import { cn } from '@/lib/utils'

interface LockedCategoriesNoticeProps {
  categories: Array<{ id: string; name: string }>
}

/** Read-only "Monthly budget (locked)" context for the yearly flow (design `eTQEb`). */
export function LockedCategoriesNotice({ categories }: LockedCategoriesNoticeProps) {
  const t = useTranslations('budgetCreate')
  if (categories.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <InfoBanner variant="info">{t('lockedBanner')}</InfoBanner>
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-sm leading-body-sm font-bold text-muted-foreground">{t('lockedTitle')}</p>
          <span className="flex items-center gap-1 text-tiny font-medium text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            {t('lockedCount', { count: categories.length })}
          </span>
        </div>
        <ul className="mt-3 flex flex-col gap-2.5">
          {categories.map((c) => {
            const tint = getCategoryTint(c.name)
            return (
              <li key={c.id} className="flex items-center gap-3 opacity-60">
                <span
                  className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tint.bg)}
                  aria-hidden="true"
                >
                  {createElement(getCategoryIcon(c.name), { className: cn('h-4 w-4', tint.fg) })}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm leading-body-sm font-medium text-muted-foreground">
                  {c.name}
                </span>
                <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
