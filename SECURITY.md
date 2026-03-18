# Security Policy

## Supported Versions

We take security seriously and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within Pomofly, please send an email to the maintainers. All security vulnerabilities will be promptly addressed.

**Please do not report security vulnerabilities through public GitHub issues.**

## Automated Security Monitoring

This project uses several automated tools to monitor and address security vulnerabilities:

### Dependabot
- **Purpose**: Automatically creates pull requests for security updates
- **Schedule**: Weekly scans on Mondays at 9:00 AM
- **Scope**: Both direct and indirect dependencies
- **Auto-merge**: Enabled for patch and minor security updates

### NPM Audit
- **Manual Check**: Run `yarn audit` or `npm audit`
- **Fix Issues**: Run `yarn audit:fix` or `npm audit fix`
- **Security Report**: Run `yarn security:report` to generate JSON report

## Security Best Practices

### For Contributors
1. Always run `yarn audit` before submitting pull requests
2. Keep dependencies up to date
3. Review Dependabot PRs promptly
4. Don't commit sensitive information (API keys, secrets)
5. Use environment variables for configuration

### For Maintainers
1. Review all Dependabot PRs within 24 hours
2. Investigate high-severity vulnerabilities immediately
3. Test security updates in staging before merging
4. Monitor security advisories for used dependencies
5. Regularly audit the dependency tree

## Vulnerability Response Process

1. **Detection**: Automated through Dependabot or manual audit
2. **Assessment**: Evaluate impact on application security
3. **Patching**: Apply fixes via dependency updates or code changes
4. **Testing**: Verify fixes don't break functionality
5. **Deployment**: Deploy fixes to production quickly
6. **Communication**: Notify users if necessary

## Security-Related Configuration

### Dependabot Configuration
- Located in `.github/dependabot.yml`
- Configured for security-focused updates
- Auto-merges safe updates
- Groups related security patches

### Audit Scripts
- `yarn audit` - Check for vulnerabilities
- `yarn audit:fix` - Auto-fix vulnerabilities when possible
- `yarn security:check` - Check with moderate severity threshold
- `yarn security:report` - Generate detailed security report

## Known Security Considerations

- **Environment Variables**: All sensitive config is in environment variables
- **Firebase Security**: Firestore rules limit data access appropriately
- **Client-Side**: No sensitive operations performed client-side
- **Dependencies**: Regular automated scanning and updates

## Contact

For security-related questions or concerns, please contact the maintainers through the repository issues (for non-sensitive matters) or via email for security vulnerabilities.