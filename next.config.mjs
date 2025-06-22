import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  swcMinify: true,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    }
  },
  webpack: (config, { dev, isServer }) => {
    config.optimization.moduleIds = 'deterministic';
    
    if (!dev) {
      config.optimization.usedExports = true;
    }
    
    return config;
  },
}

export default withNextIntl(nextConfig);