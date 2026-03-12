# Content Security Policy (CSP) Implementation

This document outlines the Content Security Policy implementation for Pomofly, addressing security vulnerabilities and protecting against XSS attacks and code injection.

## Overview

Content Security Policy (CSP) is a security layer that helps detect and mitigate Cross-Site Scripting (XSS) attacks, code injection, and other client-side security threats by declaring which dynamic resources are allowed to load.

## Implementation

### CSP Directives

The following CSP directives are implemented:

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' data: https://fonts.gstatic.com
img-src 'self' data: https: blob:
connect-src 'self' https://*.firebase.googleapis.com https://firebaseinstallations.googleapis.com https://firebase.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://api.anthropic.com
frame-src 'none'
object-src 'none'
base-uri 'self'
form-action 'self'
frame-ancestors 'none'
upgrade-insecure-requests
block-all-mixed-content
```

### Security Headers

Additional security headers are implemented:

- **X-Frame-Options**: `DENY` - Prevents clickjacking attacks
- **X-Content-Type-Options**: `nosniff` - Prevents MIME type sniffing
- **Referrer-Policy**: `strict-origin-when-cross-origin` - Controls referrer information
- **X-XSS-Protection**: `1; mode=block` - Enables XSS filtering (legacy browsers)
- **Permissions-Policy**: Restricts dangerous browser features

## Whitelisted Domains

### Google Services
- `www.googletagmanager.com` - Google Tag Manager
- `www.google-analytics.com` - Google Analytics
- `ssl.google-analytics.com` - Secure Google Analytics
- `fonts.googleapis.com` - Google Fonts CSS
- `fonts.gstatic.com` - Google Fonts resources

### Firebase Services
- `*.firebase.googleapis.com` - Firebase APIs
- `firebaseinstallations.googleapis.com` - Firebase Installations
- `identitytoolkit.googleapis.com` - Firebase Authentication
- `securetoken.googleapis.com` - Firebase Auth tokens

### AI Services
- `api.anthropic.com` - Claude AI API

## Monitoring & Reporting

### CSP Violation Monitoring

The app includes a CSP violation reporting system that:

1. **Listens for violations**: Uses the `securitypolicyviolation` event
2. **Logs in development**: Provides detailed violation information for debugging
3. **Structured reporting**: Creates standardized violation reports
4. **Future monitoring**: Ready for production monitoring service integration

### Development Testing

A CSP testing component is included for development:

- Test inline script violations
- Test external script violations  
- Validate CSP policy presence
- Console logging for debugging

## Files Modified

1. **`next.config.mjs`**: CSP headers configuration
2. **`public/_headers`**: Static headers file for deployment platforms
3. **`src/utils/csp-reporter.ts`**: Violation reporting utilities
4. **`src/components/CSPMonitor.tsx`**: CSP monitoring component
5. **`src/app/layout.tsx`**: Integrated CSP monitoring

## Deployment Considerations

### Static Export Compatibility

The CSP implementation is designed for Next.js static export:

- Headers configured in `next.config.mjs`
- Static `_headers` file for platforms like Netlify/Vercel
- No dependency on server-side features

### Known Limitations

1. **`'unsafe-inline'` for scripts**: Required for Google Analytics inline scripts
2. **`'unsafe-eval'` for scripts**: Required for some Firebase SDK features
3. **Broad `https:` for images**: Allows any HTTPS image source for flexibility

### Future Improvements

1. **Nonce-based CSP**: Replace `'unsafe-inline'` with nonce values
2. **Stricter image sources**: Replace broad `https:` with specific domains
3. **Production monitoring**: Integrate with monitoring services
4. **Regular audits**: Automated CSP policy validation

## Testing

### Manual Testing

1. Open browser developer tools
2. Check for CSP violation warnings in console
3. Verify all app functionality works correctly
4. Test external integrations (Google Analytics, Firebase)

### Automated Testing

Run the security audit script:

```bash
npm run security:audit
```

## Security Benefits

- **XSS Protection**: Blocks malicious script injection
- **Data Exfiltration Prevention**: Restricts unauthorized connections
- **Clickjacking Protection**: Prevents frame embedding attacks
- **Code Injection Prevention**: Blocks unauthorized resource loading
- **HTTPS Enforcement**: Upgrades insecure requests

## Compliance

This implementation helps achieve:

- **OWASP Security Guidelines**: Follows secure coding practices
- **Web Application Security**: Industry-standard protection
- **Privacy Regulations**: Supports GDPR compliance efforts

For questions or security concerns, refer to the security documentation or create an issue.