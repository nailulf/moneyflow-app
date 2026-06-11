'use client'

import { useTranslations } from 'next-intl'

// Placeholder — replaced by the Transactions screen sub-project.
export default function TransactionsPage() {
  const t = useTranslations('navigation.items')
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-2xl leading-title-3 font-semibold text-foreground">{t('transactions')}</h1>
      <p className="text-sm leading-body-sm text-muted-foreground">{t('comingSoon')}</p>
    </div>
  )
}
