'use client'

import { useTranslations } from 'next-intl'
import { Lock } from 'lucide-react'
import { InfoBanner } from '@/components/features/accounts/create/InfoBanner'

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
        <p className="flex items-center gap-1.5 text-sm leading-body-sm font-bold text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {t('lockedTitle')}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <span key={c.id} className="rounded-full bg-muted px-2.5 py-1 text-tiny font-medium text-muted-foreground">
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
