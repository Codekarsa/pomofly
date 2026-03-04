/** @type {import('next').NextConfig} */
const nextConfig = {
  // CSP headers implementation (remove output: export for server deployment)
  // Commented out output: export to enable headers() function
  // output: 'export',
  
  // Enable experimental features for better performance
  experimental: {
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
  
  // CSP headers for security
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
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
  
  // Enable more aggressive code splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
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
    }
    return config;
  },
};

// CSP configuration for server-side deployment
function generateCSP() {
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline needed for Next.js
        "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
        "font-src 'self' fonts.gstatic.com data:",
        "img-src 'self' data: blob: https: http:",
        "media-src 'self' data: blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        // Firebase domains + Claude API (Anthropic)
        "connect-src 'self' *.googleapis.com *.firebase.com *.firebaseapp.com *.cloudfunctions.net wss://*.firebaseio.com https://api.anthropic.com",
        // Service Worker
        "worker-src 'self'"
    ];
    
    return csp.join('; ');
}

export default nextConfig;