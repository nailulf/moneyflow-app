'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { useAuth } from '@/contexts/AuthContext'
import { Check, Plus, ArrowRight, Loader2 } from 'lucide-react'

export function CompletionView() {
  const t = useTranslations('onboarding.completion')
  const router = useRouter()
  const { user } = useAuth()
  const { complete, closeModal, state } = useOnboarding()
  const [isCompleting, setIsCompleting] = useState(!state?.is_completed)
  // Ref-based dedupe so StrictMode double-invokes don't fire complete() twice.
  const hasFiredRef = useRef(false)
  // Keep a stable ref to `complete` so the effect below never re-runs when
  // the context recreates the callback (e.g. after setWizardData changes
  // wizardData). Without this, the cleanup cancels the in-flight promise's
  // .finally() and safety timer, while hasFiredRef blocks re-firing — leaving
  // the spinner stuck forever.
  const completeRef = useRef(complete)
  useEffect(() => { completeRef.current = complete })

  // Fire complete() exactly once on mount (unless onboarding was already
  // marked completed by an earlier flow). We don't depend on the context
  // `loading` flag for the spinner gate — that flag flips for every
  // unrelated context op and used to leave us spinning forever.
  useEffect(() => {
    if (state?.is_completed) {
      setIsCompleting(false)
      return
    }
    if (hasFiredRef.current) return
    hasFiredRef.current = true

    let cancelled = false

    // Safety net: if the request hangs, give up the spinner after 5s so
    // the user can still click the activation CTAs.
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setIsCompleting(false)
    }, 5000)

    completeRef.current()
      .catch((err) => {
        console.error('Error completing onboarding:', err)
      })
      .finally(() => {
        if (!cancelled) setIsCompleting(false)
      })

    return () => {
      cancelled = true
      clearTimeout(safetyTimer)
    }
  }, [state?.is_completed])

  const handleAddFirstExpense = () => {
    closeModal()
    router.push('/transactions/new')
  }

  const handleSkipToDashboard = () => {
    closeModal()
  }

  if (isCompleting) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#20507F] mb-4" />
        <p className="text-sm text-[#5A6B7A]">{t('finishing')}</p>
      </div>
    )
  }

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    ''

  return (
    <>
      {/*
       * 1:1 mapping to landing page.pen frame zCSGO
       * (5. Completion + First Transaction):
       *
       *   yem72  Hero    — $primary #20507F, h=260, two concentric ellipses
       *                    ($primary-light #2A6FA3 200, $accent #98D2C0 120),
       *                    lucide:check 64×64 in $primary
       *   lvcRx  Body    — padding [24,40], gap 20, centered
       *   feEq7  Title   — Inter 24/bold, $text-dark #1A1A2E
       *   nrZbO  Sub     — Inter 14/normal, $text-secondary #5A6B7A
       *   jOGFG  Card    — $bg-warm #F6F8D5, radius 14, padding [22,24], gap 14
       *     6Q4fJ        — 44×44 $primary circle, white plus (22×22)
       *     ZgN4f Title  — Inter 16/bold, $text-dark
       *     eYDwG Sub    — Inter 12/normal, $text-secondary
       *     iRZtR Div    — #00000018 1px
       *     20xD7 CTA    — $primary, radius 10, h=48, "Add my first expense" + arrow
       *   Hna7v  Footer  — $bg-light #F8FAF9, padding [24,48], top border,
       *                    "Skip for now · go to dashboard" $text-muted #8899AA
       */}
      <div className="flex h-full min-h-0 flex-col -mx-4 sm:-mx-6">
        {/* Hero — full-bleed primary block with concentric circles. We use
            absolute positioning to mirror the pen's pixel-precise stack so
            the off-center composition (offset right) survives at this width. */}
        <div className="relative h-[220px] shrink-0 overflow-hidden bg-[#20507F]">
          <div
            aria-hidden
            className="absolute h-[180px] w-[180px] rounded-full bg-[#2A6FA3]"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          />
          <div
            aria-hidden
            className="absolute flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[#98D2C0]"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <Check className="h-14 w-14 text-[#20507F]" strokeWidth={3} />
          </div>
        </div>

        {/* Body — centered title + sub + warm yellow card */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-10 py-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#1A1A2E]">
              {firstName
                ? `${t('titleWithName', { name: firstName })}`
                : t('title')}
            </h2>
            <p className="mt-2 text-sm text-[#5A6B7A]">
              {t('description')}
            </p>
          </div>

          {/* Warm yellow first-transaction card — pen jOGFG */}
          <div className="mt-6 rounded-2xl bg-[#F6F8D5] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#20507F]">
                <Plus className="h-5 w-5 text-white" strokeWidth={3} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-[#1A1A2E]">
                  {t('firstExpense.title')}
                </p>
                <p className="text-xs text-[#5A6B7A]">
                  {t('firstExpense.subtitle')}
                </p>
              </div>
            </div>

            {/* Divider — pen iRZtR uses #00000018 (≈ rgba(0,0,0,0.094)) */}
            <div className="my-4 h-px bg-black/10" aria-hidden />

            {/* Primary CTA inside the card — pen 20xD7 */}
            <button
              type="button"
              onClick={handleAddFirstExpense}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#20507F] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A4168]"
            >
              {t('addFirstExpense')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Footer — pen Hna7v: $bg-light bar with text-link skip */}
        <div className="flex items-center justify-center border-t border-[#E2E8F0] bg-[#F8FAF9] px-6 py-5 sm:px-12">
          <button
            type="button"
            onClick={handleSkipToDashboard}
            className="text-[13px] font-medium text-[#8899AA] transition-colors hover:text-[#5A6B7A]"
          >
            {t('skipToDashboard')}
          </button>
        </div>
      </div>

    </>
  )
}
