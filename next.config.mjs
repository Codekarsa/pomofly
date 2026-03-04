/** @type {import('next').NextConfig} */
const nextConfig = {
    // Keep static export for simpler deployment
    output: 'export',
    
    // Note: Custom headers (including CSP) are not supported with static export
    // For CSP implementation with static export, consider:
    // 1. Setting headers at the CDN/server level (Cloudflare, Nginx, etc.)
    // 2. Using a meta tag approach (limited CSP support)
    // 3. Switching to server-side rendering if comprehensive CSP is required
    
    // If you need to enable CSP, remove 'output: export' and uncomment the headers() function below:
    
    // async headers() {
    //     return [
    //         {
    //             source: '/(.*)',
    //             headers: [
    //                 {
    //                     key: 'Content-Security-Policy',
    //                     value: generateCSP()
    //                 },
    //                 {
    //                     key: 'X-Frame-Options',
    //                     value: 'DENY'
    //                 },
    //                 {
    //                     key: 'X-Content-Type-Options',
    //                     value: 'nosniff'
    //                 },
    //                 {
    //                     key: 'Referrer-Policy',
    //                     value: 'origin-when-cross-origin'
    //                 },
    //                 {
    //                     key: 'Permissions-Policy',
    //                     value: 'camera=(), microphone=(), geolocation=()'
    //                 }
    //             ]
    //         }
    //     ];
    // }
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