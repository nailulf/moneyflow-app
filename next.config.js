/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist'],
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle PDF.js worker files
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js'
    };
    
    return config;
  },
   async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ]
      }
    ];
  },
    serverActions: {}
    // Or if you don't need specific options, remove serverActions completely
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig