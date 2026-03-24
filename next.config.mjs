/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Firebase hosting and static deployment
  output: 'export',
  
  // Required for static export
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // Image optimization for static export
  images: {
    unoptimized: true, // Required for static export
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year cache
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@radix-ui/react-icons', 
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      'lucide-react',
      'date-fns',
      'clsx',
      'class-variance-authority'
    ],
    nextScriptWorkers: true, // Move scripts to web worker
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'dev',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  
  // Generate build ID for better caching
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA || 
           process.env.GITHUB_SHA || 
           `build-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  },
  
  // TypeScript and ESLint configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Enhanced webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer integration
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
          analyzerPort: 8888,
        })
      );
    }
    
    // Production optimizations
    if (!dev && !isServer) {
      // Code splitting optimization
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000, // ~240KB chunks for optimal loading
          cacheGroups: {
            // Framework chunk (React, Next.js)
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // UI components chunk
            ui: {
              name: 'ui-components',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|@shadcn)[\\/]/,
              priority: 30,
              minChunks: 1,
            },
            // Firebase chunk
            firebase: {
              name: 'firebase',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              priority: 25,
              minChunks: 1,
            },
            // Utilities chunk
            utils: {
              name: 'utils',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](date-fns|clsx|class-variance-authority|tailwind-merge)[\\/]/,
              priority: 20,
              minChunks: 1,
            },
            // Vendor chunk (everything else)
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              minChunks: 2,
            },
          },
        },
        // Tree shaking
        usedExports: true,
        sideEffects: false,
      };
    }
    
    // TODO: Add PWA service worker configuration with workbox-webpack-plugin
    // Requires: yarn add -D workbox-webpack-plugin
    
    return config;
  },
};

export default nextConfig;