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
    },
    optimizeCss: true,
    optimizePackageImports: ['react-icons', 'date-fns', 'lodash', 'antd', '@ant-design/icons'],
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