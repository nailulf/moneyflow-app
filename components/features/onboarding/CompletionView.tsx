'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAccounts } from '@/contexts/AccountContext'
import { useCategories } from '@/contexts/CategoryContext'
import { Button } from '@/components/ui/atoms/button'
import { Check, ArrowRight, Loader2 } from 'lucide-react'

export function CompletionView() {
  const t = useTranslations('onboarding.completion')
  const { complete, closeModal, loading } = useOnboarding()
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const [isCompleting, setIsCompleting] = useState(false)
  const [summary, setSummary] = useState<{
    accountsCreated: number
    categoriesCount: number
    budgetsCreated: number
  } | null>(null)

  useEffect(() => {
    const completeOnboarding = async () => {
      if (isCompleting || summary) return

      setIsCompleting(true)
      try {
        const result = await complete()
        setSummary(result)
      } catch (error) {
        console.error('Error completing onboarding:', error)
        setSummary({
          accountsCreated: accounts.length,
          categoriesCount: categories.length,
          budgetsCreated: 0
        })
      } finally {
        setIsCompleting(false)
      }
    }

    completeOnboarding()
  }, [])

  const handleGoToDashboard = () => {
    closeModal()
  }

  if (isCompleting || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{t('finishing')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center text-center py-6 space-y-6">
      {/* Success Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <Check className="h-8 w-8 text-success" strokeWidth={3} />
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      {/* Setup Summary */}
      {summary && (
        <div className="w-full max-w-sm space-y-3 text-left bg-muted/30 rounded-lg p-4">
          <h3 className="font-medium text-sm text-center mb-3">{t('summary.title')}</h3>
          <div className="flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
              <Check className="h-3 w-3 text-success" />
            </div>
            <span className="text-sm">
              {summary.accountsCreated > 0
                ? t(summary.accountsCreated > 1 ? 'summary.accountsCreated' : 'summary.accountCreated', { count: summary.accountsCreated })
                : t('summary.accountsReady')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
              <Check className="h-3 w-3 text-success" />
            </div>
            <span className="text-sm">
              {t('summary.categoriesConfigured', { count: summary.categoriesCount })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20">
              <Check className="h-3 w-3 text-success" />
            </div>
            <span className="text-sm">
              {summary.budgetsCreated > 0
                ? t('summary.budgetCreated')
                : t('summary.budgetReady')}
            </span>
          </div>
        </div>
      )}

      {/* CTA */}
      <Button onClick={handleGoToDashboard} className="gap-2 w-full max-w-xs">
        {t('goToDashboard')}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
