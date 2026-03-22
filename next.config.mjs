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
  
  // Enable experimental features for better performance
  experimental: {
    webpackBuildWorker: true,
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  
  // Configure static generation for better performance
  async generateBuildId() {
    // This can be used to create a custom build ID
    return 'build-' + new Date().toISOString().replace(/[:.]/g, '-');
  },
  
  // Ensure proper handling of environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
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
      
      // Enhanced code splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Create separate chunks for heavy UI components
            ui: {
              name: 'ui-components',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              priority: 20,
            },
            // Create a separate chunk for Firebase
            firebase: {
              name: 'firebase',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              priority: 15,
            },
            // Create a separate chunk for heavy libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
              minChunks: 2,
            },
          },
        },
      };
      
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
            key: 'Content-Security-Policy',
            value: generateCSP()
          },
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
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
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
      {
        source: '/api/csp-report',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
};

// Enhanced CSP configuration for server-side deployment with XSS protection
function generateCSP() {
    const csp = [
        "default-src 'self'",
        // More restrictive script policy - remove unsafe-eval for better security
        "script-src 'self' 'unsafe-inline'", // Note: Next.js requires unsafe-inline
        "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
        "font-src 'self' fonts.gstatic.com data:",
        // More restrictive image sources
        "img-src 'self' data: blob: https://lh3.googleusercontent.com", // Google profile images
        "media-src 'self' data: blob:",
        "object-src 'none'",
        "embed-src 'none'", // Prevent embed tags
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "frame-src 'none'", // Prevent iframes
        // Firebase domains + Claude API (Anthropic)
        "connect-src 'self' *.googleapis.com *.firebase.com *.firebaseapp.com *.cloudfunctions.net wss://*.firebaseio.com https://api.anthropic.com",
        // Service Worker
        "worker-src 'self'",
        // Prevent execution of plugins
        "plugin-types 'none'",
        // CSP violation reporting
        "report-uri /api/csp-report"
    ];
    
    return csp.join('; ');
}

export default nextConfig;