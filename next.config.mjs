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
  
  // Enhanced security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    const securityHeaders = [
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
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
      },
      // Remove server identification
      {
        key: 'X-Powered-By',
        value: ''
      },
      {
        key: 'Server',
        value: 'Pomofly'
      }
    ];

    // Add HSTS in production only
    if (!isDev) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload'
      });
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      },
      // API-specific headers
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, private'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
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

// Enhanced CSP configuration with comprehensive security directives
function generateCSP() {
    const isDev = process.env.NODE_ENV === 'development';
    
    const csp = [
        "default-src 'self'",
        
        // Script sources - strict policy
        isDev 
          ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" // Dev needs eval for hot reload
          : "script-src 'self' 'unsafe-inline'", // Production: no eval
          
        // Styles - allow Google Fonts
        "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
        
        // Fonts - Google Fonts + data URIs
        "font-src 'self' fonts.gstatic.com data:",
        
        // Images - strict policy with specific exceptions
        "img-src 'self' data: blob: https://lh3.googleusercontent.com https://lh4.googleusercontent.com",
        
        // Media
        "media-src 'self' data: blob:",
        
        // Prevent dangerous elements
        "object-src 'none'",
        "embed-src 'none'",
        
        // Base URI protection
        "base-uri 'self'",
        
        // Form submission
        "form-action 'self'",
        
        // Frame protection
        "frame-ancestors 'none'",
        "frame-src 'none'",
        
        // Connection sources - Firebase and Claude API
        `connect-src 'self' *.googleapis.com *.firebase.com *.firebaseapp.com *.cloudfunctions.net wss://*.firebaseio.com https://api.anthropic.com ${isDev ? 'ws: wss:' : ''}`,
        
        // Service Workers
        "worker-src 'self' blob:",
        
        // Manifest
        "manifest-src 'self'",
        
        // Prevent plugins
        "plugin-types",
        
        // Upgrade insecure requests in production
        ...(isDev ? [] : ["upgrade-insecure-requests"]),
        
        // CSP violation reporting
        "report-uri /api/csp-report"
    ];
    
    return csp.join('; ');
}

export default nextConfig;
