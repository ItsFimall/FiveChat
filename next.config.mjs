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
    optimizePackageImports: ['antd', 'lodash', '@ant-design/icons', '@icon-park/react', 'react-window', 'react-markdown'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // 启用更多实验性优化
    optimizeCss: true,
    scrollRestoration: true,
    // 启用并行构建和缓存优化
    webVitalsAttribution: ['CLS', 'LCP', 'FID', 'FCP'],
    // 启用 React 18 并发特性
    serverComponentsExternalPackages: ['sharp'],
    // 优化字体加载
    fontLoaders: [
      { loader: '@next/font/google', options: { subsets: ['latin'] } },
    ],
    // Turbopack 相关优化
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
      resolveAlias: {
        // 优化常用库的解析
        'react-window': 'react-window/dist/index.esm.js',
      },
    },
    // 启用增量静态再生优化
    isrMemoryCacheSize: 0, // 禁用内存缓存，使用磁盘缓存
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