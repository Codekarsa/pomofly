/** @type {import('next').NextConfig} */
let BundleAnalyzerPlugin;
try {
  BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
} catch (e) {
  // Bundle analyzer is optional
  BundleAnalyzerPlugin = null;
}

const nextConfig = {
  output: 'export', // Static export for Firebase hosting
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
  
  // PWA configuration
  experimental: {
    webpackBuildWorker: true,
  },
  
  webpack(config, { isServer, dev }) {
    // Bundle analyzer for performance monitoring (optional)
    if (process.env.ANALYZE === 'true' && !isServer && !dev && BundleAnalyzerPlugin) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'json',
          generateStatsFile: true,
          openAnalyzer: false,
        })
      );
    }
    
    // Performance optimizations
    if (!dev && !isServer) {
      // Tree shaking and code splitting optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Minimize bundle size
      config.resolve.alias = {
        ...config.resolve.alias,
        // Add bundle size optimizations
        'react/jsx-runtime': 'react/jsx-runtime.js',
        'react/jsx-dev-runtime': 'react/jsx-dev-runtime.js',
      };
    }
    
    return config;
  },
  
  // Performance and security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Cache static assets for performance
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;