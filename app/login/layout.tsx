/**
 * Login frame (design Row C — "Welcome back").
 *
 * Minimal full-screen mobile shell: no authed app chrome, no bottom nav, and
 * NOT the legacy (auth) two-column brand sidebar. Centers a phone-width column
 * on the page background so the returning-user sign-in reads the same on a
 * 390px phone and on desktop — matching the guest funnel (`app/start/layout.tsx`).
 */
export default function LoginLayout({
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
