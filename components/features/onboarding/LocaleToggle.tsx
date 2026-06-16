'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { setLocaleCookie, type SupportedLocale } from '@/lib/actions/locale'

const LOCALES: SupportedLocale[] = ['en', 'id']

/**
 * Compact EN/ID segmented pill for the LIGHT funnel + auth-entry screens
 * (`/start`, `/login`, `/forgot-password`, `/verify-email`).
 *
 * Reuses the same locale mechanism as the authenticated switcher and the legacy
 * `AuthLanguageToggle`: writes the `MONEYFLOW_LOCALE` cookie via the
 * `setLocaleCookie` server action, then `router.refresh()` so the new messages
 * load. Styled with semantic tokens (NOT the old dark `auth.*` palette) so it
 * sits unobtrusively in a corner of the light funnel pages.
 *
 * The "EN" / "ID" labels are intentionally language-neutral locale codes — no
 * translation needed; the accessible group label is localized via `nav.language`.
 */
export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('nav')

  const handleSelect = async (next: SupportedLocale) => {
    if (next === locale) return
    await setLocaleCookie(next)
    router.refresh()
  }

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border bg-card/80 p-0.5 text-tiny font-medium shadow-card backdrop-blur',
        className,
      )}
    >
      {LOCALES.map((code) => {
        const active = code === locale
        return (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            aria-pressed={active}
            aria-label={code === 'en' ? 'English' : 'Indonesia'}
            className={cn(
              'rounded-full px-2 py-1 uppercase tracking-wide transition-colors',
              active
                ? 'bg-selected text-selected-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {code}
          </button>
        )
      })}
    </div>
  )
}
