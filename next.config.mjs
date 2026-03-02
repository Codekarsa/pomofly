/** @type {import('next').NextConfig} */
const nextConfig = {
    // Removed 'output: export' to enable API routes support
    // Firebase Hosting with web frameworks can handle dynamic features
    
    async headers() {
        return [
            {
                // Apply CSP to all routes
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
    }
};

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
        "worker-src 'self'",
        // CSP violation reporting
        "report-uri /api/csp-report"
    ];
    
    return csp.join('; ');
}

export default nextConfig;
