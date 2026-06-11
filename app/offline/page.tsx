'use client'

import { WifiOff } from 'lucide-react'

const STRINGS = {
  en: { title: "You're offline", body: 'Check your connection and try again. Your saved data is safe.', retry: 'Retry' },
  id: { title: 'Anda sedang offline', body: 'Periksa koneksi Anda dan coba lagi. Data Anda tetap aman.', retry: 'Coba lagi' },
} as const

export default function OfflinePage() {
  const isID = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('id')
  const t = isID ? STRINGS.id : STRINGS.en
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl leading-title-3 font-semibold text-foreground">{t.title}</h1>
      <p className="max-w-xs text-sm leading-body-sm text-muted-foreground">{t.body}</p>
      <button
        onClick={() => typeof window !== 'undefined' && window.location.reload()}
        className="rounded-md bg-primary px-5 py-2 text-sm leading-body-sm text-primary-foreground hover:bg-primary/90"
      >
        {t.retry}
      </button>
    </main>
  )
}
