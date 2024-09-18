/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    
    remotePatterns: [
      
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '/assets',
      },
    ],
  },
};

export default nextConfig;