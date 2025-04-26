/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,

    domains: ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com'],
  },
  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap',
      },
    ]
  },
}

module.exports = nextConfig 