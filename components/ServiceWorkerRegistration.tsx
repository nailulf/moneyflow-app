'use client'

import { useEffect, useRef } from 'react'
import { Serwist } from '@serwist/window'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export function ServiceWorkerRegistration() {
  const t = useTranslations('pwa')
  const tRef = useRef(t)

  useEffect(() => {
    tRef.current = t
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const sw = new Serwist('/sw.js', { scope: '/' })

    sw.addEventListener('waiting', () => {
      toast(tRef.current('updateAvailable'), {
        duration: Infinity,
        action: {
          label: tRef.current('reload'),
          onClick: () => {
            sw.addEventListener('controlling', () => window.location.reload())
            void sw.messageSkipWaiting()
          },
        },
      })
    })

    void sw.register()
  }, [])

  return null
}
