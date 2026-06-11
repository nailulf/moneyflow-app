'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/atoms/button'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> }

export function InstallPrompt() {
  const t = useTranslations('pwa')
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferred || dismissed) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">
      <Download aria-hidden="true" className="size-5 text-primary" />
      <p className="flex-1 text-sm leading-body-sm text-foreground">{t('installTitle')}</p>
      <Button size="sm" onClick={async () => { await deferred.prompt(); setDeferred(null) }}>
        {t('install')}
      </Button>
      <Button variant="ghost" size="icon" aria-label={t('dismiss')} onClick={() => setDismissed(true)}>
        <X className="size-4" />
      </Button>
    </div>
  )
}
