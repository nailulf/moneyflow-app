/**
 * Pre-account onboarding frame (Row A — Guest Entry).
 *
 * Minimal full-screen mobile shell: no authed app chrome, no bottom nav.
 * Centers a phone-width column on the page background so the guest funnel
 * reads the same on a 390px phone and on desktop.
 */
export default function StartLayout({
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
