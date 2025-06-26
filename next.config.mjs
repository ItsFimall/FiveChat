import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  swcMinify: true,
  compress: true,
  // 启用更多性能优化
  poweredByHeader: false,
  reactStrictMode: true,
  // 优化图片
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  modularizeImports: {
    'lodash': {
      transform: 'lodash/{{member}}',
    },
    '@ant-design/icons': {
      transform: '@ant-design/icons/lib/icons/{{member}}',
      preventFullImport: true,
    },
    'antd': {
      transform: 'antd/lib/{{member}}',
      preventFullImport: true,
    },
  },
  experimental: {
    cssChunking: 'strict',
    optimizePackageImports: ['antd', 'lodash'],
    serverActions: {
      bodySizeLimit: '5mb',
    },
    // 启用更多实验性优化
    optimizeCss: true,
    scrollRestoration: true,
  },
  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg'),
    )

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
        use: ['@svgr/webpack'],
      },
    )

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i

    return config
  },
}

export default withNextIntl(nextConfig);