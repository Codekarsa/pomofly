/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed 'output: export' which was incompatible with API routes and dynamic routes
  // This enables proper SSR/SSG hybrid functionality for Firebase hosting
  
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

export default nextConfig;
