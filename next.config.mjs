/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to allow API routes to function properly
  // Static export mode is incompatible with Next.js API routes
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
# API routes enabled - static export removed
