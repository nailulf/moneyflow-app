import './globals.css'
import type { Viewport } from 'next'
import LayoutWrapper from '@/components/LayoutWrapper'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual',
}

export const metadata = {
  title: 'MoneyFlow - Personal Finance Tracker',
  description: 'Track your expenses and manage your finances with ease',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ErrorBoundary>
            <LayoutWrapper>{children}</LayoutWrapper>
          </ErrorBoundary>
          <SpeedInsights />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
