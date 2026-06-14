'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { setLocaleCookie, type SupportedLocale } from '@/lib/actions/locale'

export function AuthLanguageToggle() {
  const locale = useLocale()
  const router = useRouter()

  const handleLocale = async (newLocale: SupportedLocale) => {
    await setLocaleCookie(newLocale)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-0.5 text-xs text-auth-sidebar-foreground/50">
      <button
        onClick={() => handleLocale('en')}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === 'en'
            ? 'text-auth-accent font-semibold'
            : 'hover:text-auth-sidebar-foreground/80'
        }`}
      >
        EN
      </button>
      <span>/</span>
      <button
        onClick={() => handleLocale('id')}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          locale === 'id'
            ? 'text-auth-accent font-semibold'
            : 'hover:text-auth-sidebar-foreground/80'
        }`}
      >
        ID
      </button>
    </div>
  )
}
