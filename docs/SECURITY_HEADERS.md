# Security Headers Implementation Guide

## Overview

Pomofly implements comprehensive security headers and CORS configuration to protect against common web security vulnerabilities including:

- Cross-Site Request Forgery (CSRF)
- Clickjacking attacks
- MIME type confusion
- Information disclosure
- Cross-Site Scripting (XSS)
- Content injection attacks

## Security Headers Implemented

### 1. Content Security Policy (CSP)

**Purpose**: Prevents XSS attacks by controlling resource loading

**Implementation**:
```javascript
Content-Security-Policy: default-src 'self'; 
  script-src 'self' 'unsafe-inline'; 
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  font-src 'self' fonts.gstatic.com data:;
  img-src 'self' data: blob: https://lh3.googleusercontent.com;
  connect-src 'self' *.googleapis.com *.firebase.com *.firebaseapp.com https://api.anthropic.com;
  frame-ancestors 'none';
  report-uri /api/csp-report
```

**Protection**: 
- Blocks unauthorized script execution
- Prevents data exfiltration
- Reports violations for monitoring

### 2. X-Frame-Options

**Purpose**: Prevents clickjacking attacks

**Implementation**: `X-Frame-Options: DENY`

**Protection**: Prevents embedding in frames/iframes

### 3. X-Content-Type-Options

**Purpose**: Prevents MIME type sniffing

**Implementation**: `X-Content-Type-Options: nosniff`

**Protection**: Forces browsers to respect declared content types

### 4. X-XSS-Protection

**Purpose**: Enables browser XSS filtering

**Implementation**: `X-XSS-Protection: 1; mode=block`

**Protection**: Blocks pages when XSS attacks detected

### 5. Strict-Transport-Security (HSTS)

**Purpose**: Enforces HTTPS connections

**Implementation**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

**Protection**: 
- Prevents downgrade attacks
- Enforces secure connections
- Applies to subdomains

### 6. Referrer-Policy

**Purpose**: Controls referrer information disclosure

**Implementation**: `Referrer-Policy: strict-origin-when-cross-origin`

**Protection**: Limits information leakage through referrer headers

### 7. Permissions-Policy

**Purpose**: Controls browser feature access

**Implementation**: `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`

**Protection**: Disables unnecessary browser features

## CORS Configuration

### Allowed Origins

**Development**:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:3001`

**Production**:
- `https://pomofly.com`
- `https://www.pomofly.com`
- Custom domain from `NEXT_PUBLIC_APP_URL`

### Allowed Methods

- `GET`
- `POST`
- `PUT`
- `DELETE`
- `OPTIONS`

### Allowed Headers

- `Content-Type`
- `Authorization`
- `X-Requested-With`
- `Accept`
- `Origin`
- `User-Agent`

### Security Features

1. **Origin Validation**: Strict origin checking for sensitive endpoints
2. **Preflight Handling**: Proper OPTIONS request handling
3. **Credential Support**: Controlled credential sharing
4. **Header Exposure**: Limited exposed headers for client access

## API Security Middleware

### Request Validation

- **Content-Type Validation**: Ensures JSON for POST/PUT requests
- **Size Limits**: 1MB request body limit
- **Origin Validation**: Enhanced validation for sensitive endpoints

### Rate Limiting

- **Per-IP Limiting**: Prevents DoS attacks
- **Progressive Penalties**: Escalating timeouts for violations
- **Automatic Cleanup**: Memory-efficient rate limit storage

### Security Headers

All API responses include:
- Cache control headers (no-store, no-cache)
- Security headers (XSS protection, content-type options)
- CORS headers (when appropriate)

## Implementation Details

### Middleware Integration

```typescript
// Apply security to any API route
export const POST = withSecurity(handlePOST);
export const GET = withSecurity(handleGET);
```

### Origin Validation

```typescript
// Enhanced validation for sensitive endpoints
if (!validateOriginForSensitiveEndpoint(request)) {
  return NextResponse.json(
    { error: 'Forbidden', details: 'Invalid origin for sensitive endpoint' },
    { status: 403 }
  );
}
```

### Rate Limiting

```typescript
const rateLimit = enhancedRateLimit(userId, {
  windowMs: 60000,    // 1 minute
  maxRequests: 10     // 10 requests per minute
});
```

## Security Testing

### CSP Violation Monitoring

- Violations reported to `/api/csp-report`
- Logged for security analysis
- Helps identify potential attacks

### Rate Limit Testing

- Progressive backoff for repeated violations
- Memory-efficient cleanup
- Configurable limits per endpoint

### Origin Validation Testing

- Development and production domain support
- Fallback to referrer validation
- Server-to-server request support

## Configuration

### Environment Variables

```bash
# Production domain for CORS
NEXT_PUBLIC_APP_URL=https://pomofly.com

# Environment affects security policies
NODE_ENV=production
```

### Next.js Configuration

Security headers are configured in `next.config.mjs`:

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: securityHeaders
    },
    {
      source: '/api/(.*)',
      headers: apiHeaders
    }
  ];
}
```

## Monitoring and Alerting

### CSP Violations

- Automatic logging of violations
- User agent and origin tracking
- Development vs production handling

### Rate Limit Violations

- Progressive penalty tracking
- Automatic cleanup of expired entries
- Memory usage monitoring

### Security Headers

- Automatic application to all responses
- Environment-specific configuration
- Cache control for sensitive data

## Best Practices

1. **Regular Updates**: Keep security policies updated
2. **Monitoring**: Monitor CSP violations and rate limits
3. **Testing**: Test security headers in development
4. **Documentation**: Keep security documentation current
5. **Review**: Regular security policy reviews

## Compliance

This implementation helps meet:

- **OWASP Top 10** security recommendations
- **Mozilla Observatory** security guidelines
- **NIST Cybersecurity Framework** standards
- **Common security audit** requirements

## Future Enhancements

1. **Distributed Rate Limiting**: Redis-based rate limiting
2. **Advanced CSP**: Nonce-based script execution
3. **Security Scanning**: Automated vulnerability scanning
4. **Threat Intelligence**: IP reputation checking
5. **Audit Logging**: Comprehensive security event logging