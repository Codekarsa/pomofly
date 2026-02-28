/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    experimental: {
        optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
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
