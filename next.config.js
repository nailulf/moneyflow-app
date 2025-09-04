/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Change this from a boolean to an object if you need server actions
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