const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')
const withSerwist = require('@serwist/next').default({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // Production-only: in `next dev` the SW intercepts HMR/RSC navigations and causes reload loops.
  disable: process.env.NODE_ENV === 'development',
})

// Content-Security-Policy directives. Kept as an ordered list for readability.
// Phase 2: now ENFORCING (`Content-Security-Policy`). Every origin the app talks to
// is allowlisted below (Supabase http+wss, Amplitude, self for Vercel telemetry &
// service worker, blob for the pdf.js/serwist workers).
// Phase 3 will replace `script-src 'unsafe-inline'` with a per-request nonce.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
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
]

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // Enforcing (Phase 2). If a legit origin is ever blocked, add it to
  // cspDirectives above rather than reverting to Report-Only.
  { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Move serverComponentsExternalPackages to the correct location
  serverExternalPackages: ['pdfjs-dist'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },

  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle PDF.js worker files
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js'
    };

    return config;
  },

  experimental: {
    // Keep only valid experimental features
    serverActions: {}
  },
}

module.exports = withNextIntl(withSerwist(nextConfig))