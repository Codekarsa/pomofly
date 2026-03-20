/** @type {import('next').NextConfig} */
const nextConfig = {
  // CSP headers implementation (remove output: export for server deployment)
  // Commented out output: export to enable headers() function
  // output: 'export',

  // Image optimization configuration
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Static asset compression
  compress: true,

  // Environment-specific configuration
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',
  
  // Generate build ID for better caching
  generateBuildId: async () => {
    if (process.env.NODE_ENV === 'production') {
      return process.env.VERCEL_GIT_COMMIT_SHA || 'build-' + new Date().toISOString().replace(/[:.]/g, '-');
    }
    return 'dev';
  },

  // Bundle analysis setup
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, options) => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
      return nextConfigWebpack(config, options);
    },
  }),

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    optimizeCss: true,
    nextScriptWorkers: true,
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

  // CSP headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: generateCSP(),
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
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Override webpack if not using bundle analyzer
  ...(!process.env.ANALYZE && { webpack: nextConfigWebpack }),
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
    'report-uri /api/csp-report',
  ];

  return csp.join('; ');
}

// Webpack configuration function (shared between normal and analyzer modes)
function nextConfigWebpack(config, { isServer }) {
  if (!isServer) {
    // Enable more aggressive code splitting for client-side bundles
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        maxSize: 244000, // ~240KB chunks
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Create separate chunks for heavy UI components
          ui: {
            name: 'ui-components',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
            priority: 20,
            enforce: true,
          },
          // Create a separate chunk for Firebase
          firebase: {
            name: 'firebase',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            priority: 15,
            enforce: true,
          },
          // Create a separate chunk for heavy libraries
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            minChunks: 2,
            maxSize: 244000,
          },
        },
      },
    };

    // Tree shaking optimization
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
  }

  // Production optimizations
  if (process.env.NODE_ENV === 'production') {
    config.optimization.minimize = true;
  }

  return config;
}

// Check if PWA plugin is available and add PWA support
let finalConfig = nextConfig;
try {
  const withPWA = require('next-pwa');
  finalConfig = withPWA({
    ...nextConfig,
    pwa: {
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development',
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
            cacheKeyWillBeUsed: async ({ request }) => {
              return `${request.url}`;
            },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
          },
        },
        {
          urlPattern: /\.(?:js|css)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-resources-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
            },
          },
        },
      ],
    },
  });
} catch (error) {
  console.warn('PWA plugin not available, continuing without PWA support');
}

export default finalConfig;
