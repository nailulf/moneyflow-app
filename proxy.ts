import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

/**
 * Build the Content-Security-Policy for a request, given a fresh per-request nonce.
 *
 * script-src uses `'nonce-<n>' 'strict-dynamic'`: modern browsers trust only the
 * nonced Next.js bootstrap script + whatever it loads (chunks, Vercel Analytics,
 * the service-worker registration — all injected by already-trusted bundle code).
 * `'unsafe-inline' https:` are legacy fallbacks that CSP3 browsers IGNORE once a
 * nonce is present; they only apply to old browsers that don't support nonces.
 *
 * style-src keeps `'unsafe-inline'` on purpose — Tailwind/Radix inject inline
 * styles at runtime that can't be nonced, and style injection is far lower risk
 * than script injection.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api2.amplitude.com https://api-sr.amplitude.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export async function proxy(request: NextRequest) {
  // Nonce-based CSP runs in production only. In `next dev`, HMR relies on eval and
  // inline scripts, so we skip the CSP header entirely and let dev work unhindered.
  // The static headers (HSTS, X-Frame-Options, …) still come from next.config.js.
  const isProd = process.env.NODE_ENV === 'production';
  const nonce = isProd ? btoa(crypto.randomUUID()) : undefined;
  const csp = nonce ? buildCsp(nonce) : undefined;

  // Run the Supabase auth middleware. When a nonce is set it's threaded into the
  // forwarded request headers so Next.js stamps it onto its own <script> tags.
  const response = await updateSession(request, nonce, csp);

  if (csp) {
    response.headers.set('Content-Security-Policy', csp);
  }

  // Redirects carry no rendered scripts — set CSP (above) and return without the
  // client-side tracking headers.
  if (response.status === 307 || response.status === 308 || response.status === 302) {
    return response;
  }

  response.headers.set('x-page-path', request.nextUrl.pathname);
  response.headers.set('x-referrer', request.headers.get('referer') || '');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
