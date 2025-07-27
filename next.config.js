/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Change this from a boolean to an object if you need server actions
    serverActions: {}
    // Or if you don't need specific options, remove serverActions completely
  }
}

module.exports = nextConfig