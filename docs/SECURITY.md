# Security Guide for Pomofly

This document outlines security practices, scanning procedures, and recommendations for the Pomofly application.

## Quick Start

Run comprehensive security scanning:

```bash
./scripts/security-scan.sh --all
```

## Security Scanning

### Local Security Scanner

The `scripts/security-scan.sh` script provides comprehensive security analysis including:

- **Dependency Vulnerability Scanning**: Identifies known security issues in npm packages
- **Secret Detection**: Scans for accidentally committed API keys, tokens, and credentials  
- **License Compliance**: Checks for problematic licenses that may affect commercial usage

#### Usage

```bash
# Run all scans
./scripts/security-scan.sh --all

# Run specific scans
./scripts/security-scan.sh --deps --secrets
./scripts/security-scan.sh --licenses

# Custom output directory
./scripts/security-scan.sh --all --output ./my-reports

# Verbose output
./scripts/security-scan.sh --all --verbose
```

#### Options

| Option | Description |
|--------|-------------|
| `-a, --all` | Run all security scans |
| `-d, --deps` | Run dependency vulnerability scanning |
| `-s, --secrets` | Run secret detection |
| `-l, --licenses` | Run license compliance check |
| `-o, --output DIR` | Output directory for reports |
| `-v, --verbose` | Enable verbose output |
| `-h, --help` | Display help message |

#### Exit Codes

- `0`: All scans passed
- `1`: Critical vulnerabilities found (immediate action required)
- `2`: High-severity vulnerabilities or warnings found
- `3`: Script execution error

### Integration with CI/CD

#### GitHub Actions (Recommended)

Create `.github/workflows/security.yml`:

```yaml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Run security scan
        run: ./scripts/security-scan.sh --all
      
      - name: Upload security reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-reports
          path: security-reports/
```

#### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Running security scan before commit..."
./scripts/security-scan.sh --secrets
if [ $? -ne 0 ]; then
    echo "❌ Security scan failed. Please fix issues before committing."
    exit 1
fi
```

### Advanced Security Scanning

#### GitHub Security Features

Enable these GitHub security features:

1. **Dependabot Alerts**: Automatically enabled for public repos
2. **Secret Scanning**: Available for public repos
3. **Code Scanning**: Use CodeQL for static analysis
4. **Dependency Review**: Required for PR approvals

#### Third-party Tools

For enhanced security scanning, consider:

- **Snyk**: `npm install -g snyk && snyk auth && snyk test`
- **npm audit**: Built into npm, run with `npm audit`
- **GitLeaks**: For comprehensive secret detection
- **OWASP Dependency Check**: For Java dependencies (if applicable)

## Security Best Practices

### 1. Dependency Management

```bash
# Regular dependency updates
yarn upgrade --latest

# Audit dependencies  
yarn audit
yarn audit --level moderate

# Remove unused dependencies
yarn run depcheck
```

### 2. Environment Variables

**Never commit secrets to version control**

Use environment variables for all sensitive data:

```typescript
// ✅ Good
const apiKey = process.env.ANTHROPIC_API_KEY;

// ❌ Bad  
const apiKey = "sk-ant-api03-xxxxx";
```

Required environment variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key | `AIza...` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `pomofly-prod` |
| `ANTHROPIC_API_KEY` | Claude API key (server-side) | `sk-ant-api03-...` |

### 3. Firebase Security

#### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tasks are user-specific
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

#### Firebase Authentication

```typescript
// Implement proper auth checks
export const requireAuth = (handler: NextApiHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      return handler(req, res);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};
```

### 4. API Security

#### Input Validation

```typescript
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  pomodoroEstimate: z.number().min(1).max(50)
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validatedData = taskSchema.parse(req.body);
    // Process validated data...
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input' });
  }
}
```

#### Rate Limiting

```typescript
import { rateLimit } from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

### 5. Content Security Policy

Add to `next.config.js`:

```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https:;
      connect-src 'self' https://api.anthropic.com https://*.googleapis.com;
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## Incident Response

### 1. Security Vulnerability Discovered

1. **Immediate Assessment**: Determine severity and impact
2. **Containment**: If critical, temporarily disable affected features
3. **Fix Development**: Create patch or update dependencies
4. **Testing**: Verify fix doesn't break functionality
5. **Deployment**: Deploy fix immediately for critical issues
6. **Communication**: Notify users if necessary

### 2. Secret Exposure

1. **Immediate Revocation**: Revoke/regenerate exposed secrets
2. **Audit**: Check logs for unauthorized usage
3. **Update**: Update all systems with new secrets
4. **Prevention**: Add secret to detection patterns

### 3. Data Breach

1. **Containment**: Immediately limit access
2. **Assessment**: Determine scope of compromised data
3. **Legal**: Consult legal team for compliance obligations
4. **Communication**: Prepare user notification if required
5. **Investigation**: Full forensic analysis
6. **Remediation**: Implement additional security measures

## Security Checklist

### Development

- [ ] All secrets are in environment variables
- [ ] Input validation on all API endpoints
- [ ] Authentication required for protected resources
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Dependencies regularly updated
- [ ] Security scans pass

### Deployment

- [ ] Production environment variables configured
- [ ] Firebase security rules deployed
- [ ] SSL/TLS certificates valid
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested
- [ ] Security scanning automated

### Monitoring

- [ ] Log analysis for suspicious activity
- [ ] Dependency vulnerability monitoring
- [ ] Performance monitoring for DDoS detection
- [ ] Authentication failure alerting
- [ ] Regular security scan reports
- [ ] Incident response plan tested

## Resources

### Tools

- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Built-in vulnerability scanner
- [Snyk](https://snyk.io/) - Comprehensive vulnerability database
- [GitLeaks](https://github.com/zricethezav/gitleaks) - Secret detection
- [CodeQL](https://codeql.github.com/) - Static analysis
- [OWASP ZAP](https://zaproxy.org/) - Web application security testing

### Documentation

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Guidelines](https://firebase.google.com/docs/rules)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### Compliance

- [GDPR Compliance](https://gdpr.eu/) - If handling EU user data
- [CCPA Compliance](https://oag.ca.gov/privacy/ccpa) - If handling CA user data
- [SOC 2](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report.html) - For enterprise customers

---

**Remember**: Security is an ongoing process, not a one-time setup. Regular reviews and updates are essential.