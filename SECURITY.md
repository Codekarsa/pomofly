# Security Documentation

## Security Headers

The application includes comprehensive security headers to protect against common web vulnerabilities:

- **Content Security Policy (CSP)**: Prevents XSS attacks by controlling resource loading
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing attacks  
- **Strict-Transport-Security**: Enforces HTTPS connections
- **Referrer-Policy**: Controls referrer information leakage
- **Permissions-Policy**: Disables unnecessary browser features

## API Security

### CSRF Protection
- Origin validation for all API requests
- Secure headers on all responses
- Same-origin policy enforcement

### Rate Limiting
- **Claude API endpoint**: 10 requests per minute per IP
- **Other API endpoints**: 100 requests per minute per IP  
- Automatic cleanup of rate limit records
- Graceful error responses with retry headers

### Input Validation & Sanitization
- Request size limits (10KB maximum)
- HTML tag removal and dangerous character filtering
- Field validation with appropriate limits:
  - Task description: max 5000 characters
  - Pomodoro duration: 1-90 minutes
  - Break durations: 1-30/60 minutes respectively

### Error Handling
- No sensitive information exposed in error responses
- Consistent security headers on all API responses
- Proper HTTP status codes for different error types

## Rate Limiting Details

The application implements in-memory rate limiting suitable for development and small-scale production. For high-scale production environments, consider:

- Using Redis for distributed rate limiting
- Implementing per-user rate limits (not just per-IP)
- Adding rate limit bypass for authenticated admin users
- Monitoring and alerting on rate limit violations

## Security Best Practices

1. **Environment Variables**: Never commit credentials to version control
2. **HTTPS Only**: All production traffic must use HTTPS
3. **Regular Updates**: Keep dependencies updated for security patches
4. **Input Validation**: Always validate and sanitize user inputs
5. **Error Handling**: Never expose sensitive data in error messages