import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    scope: '/',
    name: 'Teman Tumbuh',
    short_name: 'Teman Tumbuh',
    description: 'Track your expenses and manage your finances with ease',
    lang: 'id',
    categories: ['finance'],
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#20507F',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/screenshots/aWUg3.png', sizes: '780x3814', type: 'image/png', form_factor: 'narrow' },
      { src: '/screenshots/cwEOf.png', sizes: '780x1700', type: 'image/png', form_factor: 'narrow' },
      { src: '/screenshots/k1j91.png', sizes: '780x1860', type: 'image/png', form_factor: 'narrow' },
    ],
    shortcuts: [
      { name: 'Add transaction', short_name: 'Add', url: '/spending/transaction' },
    ],
  }
}
