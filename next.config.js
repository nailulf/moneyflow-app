/** @type {import('next').NextConfig} */
const nextConfig = {
  // Move serverComponentsExternalPackages to the correct location
  serverExternalPackages: ['pdfjs-dist'],
  
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

module.exports = nextConfig