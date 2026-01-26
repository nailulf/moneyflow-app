import './globals.css'
import LayoutWrapper from '@/components/LayoutWrapper'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const metadata = {
  title: 'MoneyFlow - Personal Finance Tracker',
  description: 'Track your expenses and manage your finances with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ErrorBoundary>
      </body>
    </html>
  )
}
