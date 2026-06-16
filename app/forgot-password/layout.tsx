/**
 * Forgot-password frame — funnel-styled full-screen shell.
 *
 * Minimal full-screen mobile shell mirroring `app/login/layout.tsx`: no authed
 * app chrome, no bottom nav, and NOT the legacy (auth) two-column brand sidebar.
 * Centers a phone-width column on the page background so the reset-link request
 * reads the same on a 390px phone and on desktop.
 */
export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
        {children}
      </div>
    </div>
  )
}
