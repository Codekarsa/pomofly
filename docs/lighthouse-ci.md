# Lighthouse CI Integration

This project includes automated performance monitoring using Lighthouse CI to ensure PWA performance standards and catch performance regressions early.

## What it does

- Runs on every Pull Request
- Audits Performance, PWA, and Accessibility scores
- Enforces performance budgets:
  - Performance score: minimum 80%
  - PWA score: minimum 80%
  - Accessibility score: minimum 90%
  - First Contentful Paint: < 2.5s
  - Largest Contentful Paint: < 2.5s
  - Cumulative Layout Shift: < 0.1
  - Total Blocking Time: < 300ms
  - JavaScript bundle size: < 1MB

## Performance Budgets

The performance budgets are configured in `lighthouserc.json`:

- **Core Web Vitals**: FCP, LCP, CLS, TBT within recommended thresholds
- **Bundle Size**: JavaScript under 1MB total, CSS under 20KB unused
- **Overall Scores**: 80%+ for performance and PWA, 90%+ for accessibility

## GitHub Integration

- Runs automatically on Pull Requests
- Reports pass/fail status to GitHub
- Uploads detailed reports as artifacts
- Fails the build if critical performance regressions are detected

## Local Testing

```bash
# Run Lighthouse CI locally
yarn lighthouse:ci

# Collect only (without assertions)
yarn lighthouse:collect

# Run assertions only (after collect)
yarn lighthouse:assert

# Manual lighthouse test (existing)
yarn pwa:test
```

## Configuration

Edit `lighthouserc.json` to:
- Adjust performance budget thresholds
- Add/remove audit categories
- Configure Chrome flags for CI environment
- Set up custom assertions

## Troubleshooting

If Lighthouse CI fails:

1. Check the uploaded artifacts in GitHub Actions
2. Review performance regressions in the detailed reports
3. Consider if new features justify budget adjustments
4. Run locally to debug specific performance issues

The goal is to maintain high performance standards while allowing reasonable growth as features are added.