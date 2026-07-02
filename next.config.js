const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')
const withSerwist = require('@serwist/next').default({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // Production-only: in `next dev` the SW intercepts HMR/RSC navigations and causes reload loops.
  disable: process.env.NODE_ENV === 'development',
})

// Static security headers applied to every route. The Content-Security-Policy is
// NOT here — it needs a per-request nonce, so it's set in `proxy.ts` (middleware).
// See `buildCsp()` there. Phase 3: script-src uses a nonce + 'strict-dynamic'.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
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