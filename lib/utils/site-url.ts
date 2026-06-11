/**
 * Canonical site base URL. Prefer NEXT_PUBLIC_SITE_URL (stable across web + future
 * mobile/webview clients) over window.location.origin, which is unreliable inside a
 * Capacitor/TWA webview (e.g. capacitor://localhost).
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  // Server-side with no configured URL: fail loud in production rather than
  // silently emitting localhost links in auth emails.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[getSiteUrl] NEXT_PUBLIC_SITE_URL must be set in production')
  }
  return 'http://localhost:3000'
}
