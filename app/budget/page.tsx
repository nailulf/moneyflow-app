'use client'

import { useTranslations } from 'next-intl'

// Placeholder — replaced by the Budget screen sub-project.
export default function BudgetPage() {
  const t = useTranslations('navigation.items')
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
      <p className="text-lg leading-body-lg font-semibold text-foreground">{t('comingSoon')}</p>
    </div>
  )
}
