'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/atoms/button'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> }
const DISMISS_KEY = 'pwa-install-dismissed'

export function InstallPrompt() {
  const t = useTranslations('pwa')
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    const handler = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferred || dismissed) return null

  const dismiss = () => { localStorage.setItem(DISMISS_KEY, '1'); setDismissed(true) }

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg md:bottom-3">
      <Download aria-hidden="true" className="size-5 text-primary" />
      <p className="flex-1 text-sm leading-body-sm text-foreground">{t('installTitle')}</p>
      <Button size="sm" onClick={async () => { await deferred.prompt(); setDeferred(null) }}>
        {t('install')}
      </Button>
      <Button variant="ghost" size="icon" aria-label={t('dismiss')} onClick={dismiss}>
        <X className="size-4" />
      </Button>
    </div>
  )
}
