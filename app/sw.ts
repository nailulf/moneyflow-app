import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}
declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,            // user-initiated activation via update toast (a later task)
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Never cache authenticated/financial GET /api/* responses (Serwist does not route non-GET).
    { matcher: ({ url }) => url.pathname.startsWith('/api/'), handler: new NetworkOnly() },
    // Never PERSIST authenticated HTML documents or RSC payloads — prevents serving one user's
    // cached page to another on a shared device. Offline navigations still fall back to /offline.
    { matcher: ({ request }) => request.destination === 'document', handler: new NetworkOnly() },
    { matcher: ({ request }) => request.headers.get('RSC') === '1', handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      { url: '/offline', matcher: ({ request }) => request.destination === 'document' },
    ],
  },
})

serwist.addEventListeners()
