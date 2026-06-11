'use client'

import { useEffect } from 'react'
import { Serwist } from '@serwist/window'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export function ServiceWorkerRegistration() {
  const t = useTranslations('pwa')
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const serwist = new Serwist('/sw.js', { scope: '/' })

    serwist.addEventListener('waiting', () => {
      toast(t('updateAvailable'), {
        duration: Infinity,
        action: {
          label: t('reload'),
          onClick: () => {
            serwist.addEventListener('controlling', () => window.location.reload())
            void serwist.messageSkipWaiting()
          },
        },
      })
    })

    void serwist.register()
  }, [t])

  return null
}
