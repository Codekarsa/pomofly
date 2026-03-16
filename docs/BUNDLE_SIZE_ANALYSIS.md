# Bundle Size Analysis and Optimization

Comprehensive bundle size monitoring, analysis, and optimization strategy for Pomofly.

## Overview

This system provides automated bundle size analysis, budget enforcement, and optimization recommendations to maintain optimal application performance.

## Features

✅ **Automated Bundle Analysis** - Analyzes webpack chunks, assets, and dependencies  
✅ **Budget Enforcement** - Configurable size limits with CI/CD integration  
✅ **Build-to-Build Comparison** - Track changes over time  
✅ **Performance Impact Assessment** - Understand the impact of changes  
✅ **Optimization Recommendations** - Actionable suggestions for improvement  
✅ **Visual Reports** - Clear, colorized console output and JSON exports  

## Quick Start

```bash
# Analyze current bundle
npm run bundle:analyze

# Check against budgets (fails CI if exceeded)
npm run bundle:budget

# Compare with previous build
npm run bundle:compare

# Update baseline for future comparisons
npm run bundle:compare -- --update-baseline

# Build with interactive analysis (opens browser)
npm run build:analyze
```

## Bundle Budgets

Current performance budgets enforce these limits:

### Core Bundles

| Metric | Warning | Error | Description |
|--------|---------|-------|-------------|
| **First Load JS** | 250 KB | 300 KB | Critical for initial page load |
| **Total CSS** | 50 KB | 100 KB | Affects initial render |
| **Total JS** | 500 KB | 800 KB | Overall JavaScript size |

### Individual Chunks

| Chunk Type | Warning | Error | Purpose |
|------------|---------|-------|---------|
| **Framework** | 150 KB | 200 KB | React, React DOM |
| **Firebase** | 100 KB | 150 KB | Firebase SDK |
| **UI Components** | 80 KB | 120 KB | Radix UI, Lucide |
| **Vendor** | 100 KB | 150 KB | Third-party libraries |
| **Page** | 50 KB | 100 KB | Individual page chunks |

### Assets

| Asset Type | Warning | Error | Notes |
|------------|---------|-------|-------|
| **Images/Media** | 500 KB | 1 MB | Per page/route |
| **Fonts** | 100 KB | 200 KB | Total font assets |

## Build Integration

### Next.js Configuration

The build automatically includes bundle size analysis:

```javascript
// next.config.mjs
webpack: (config, { isServer, webpack, dev }) => {
  // Bundle size plugin (production builds)
  if (!dev) {
    const BundleSizePlugin = require('./scripts/webpack-bundle-size-plugin.js');
    config.plugins.push(
      new BundleSizePlugin({
        outputPath: 'bundle-size-report.json',
        threshold: {
          warning: 250 * 1024, // 250KB
          error: 500 * 1024,   // 500KB
        },
      })
    );
  }

  // Enhanced code splitting
  config.optimization.splitChunks = {
    chunks: 'all',
    cacheGroups: {
      framework: { /* React, React DOM */ },
      firebase: { /* Firebase SDK */ },
      ui: { /* UI components */ },
      // ... more optimized chunks
    },
  };
}
```

### Package Scripts

```json
{
  "scripts": {
    "build": "next build && npm run bundle:analyze",
    "bundle:analyze": "node scripts/bundle-analyzer.js",
    "bundle:budget": "npm run bundle:analyze:json && node scripts/check-bundle-budget.js",
    "bundle:compare": "node scripts/compare-bundle-sizes.js"
  }
}
```

## Analysis Tools

### 1. Bundle Analyzer (`bundle-analyzer.js`)

Comprehensive analysis of build output:

```bash
node scripts/bundle-analyzer.js
```

**Output:**
- Summary statistics (First Load JS, CSS, Media)
- Largest JavaScript chunks with categorization
- Pages analysis with individual sizes
- Assets breakdown by type
- Budget compliance check

### 2. Budget Checker (`check-bundle-budget.js`)

Validates bundle sizes against budgets:

```bash
npm run bundle:budget
```

**Features:**
- Configurable warning and error thresholds
- CI/CD integration (exits with error code)
- Optimization suggestions based on violations
- Detailed JSON report for automation

### 3. Bundle Comparator (`compare-bundle-sizes.js`)

Compares builds over time:

```bash
npm run bundle:compare
```

**Tracks:**
- Size changes (absolute and percentage)
- Added/removed chunks
- Performance impact assessment
- Build-to-build timeline

### 4. Webpack Plugin (`webpack-bundle-size-plugin.js`)

Real-time build monitoring:

- Integrates with Next.js build process
- Tracks individual chunks and assets
- Threshold-based warnings and errors
- Detailed webpack-level analysis

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on:
  pull_request:
    branches: [main]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Build application
        run: npm run build:prod
      
      - name: Check bundle budgets
        run: npm run bundle:budget
      
      - name: Compare with baseline
        run: npm run bundle:compare
      
      - name: Upload bundle reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: bundle-reports
          path: |
            bundle-stats.json
            budget-report.json
            bundle-comparison.json
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
npm run bundle:budget
```

## Optimization Strategies

### Code Splitting

The build automatically splits code into optimized chunks:

```javascript
// Automatic chunks created:
// - framework: React, React DOM (cached across pages)
// - firebase: Firebase SDK (lazy-loaded where needed)
// - ui: Radix UI components (shared across app)
// - forms: Form libraries (page-specific)
// - vendor: Other third-party libraries
```

### Dynamic Imports

For page-level optimization:

```javascript
// Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));
const AdminPanel = lazy(() => import('./AdminPanel'));

// Lazy load Firebase features
const auth = () => import('firebase/auth');
const firestore = () => import('firebase/firestore');
```

### Tree Shaking

Configured for optimal tree shaking:

```javascript
// next.config.mjs
webpack: (config) => {
  config.optimization.usedExports = true;
  config.optimization.sideEffects = false;
  
  // Mark third-party libraries as side-effect free
  config.module.rules.push({
    test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
    sideEffects: false,
  });
}
```

### Asset Optimization

```javascript
// next.config.mjs
const nextConfig = {
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },
  
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react'
    ],
  },
};
```

## Bundle Analysis Reports

### Console Output

The analyzer provides color-coded output:

```
🔍 Bundle Size Analysis

📋 Summary
  First Load JS: 245.2 KB
  Total CSS: 32.1 KB
  Total Media: 156.3 KB

📦 Largest JavaScript Chunks
  187.3 KB - framework.js (framework)
  89.2 KB - firebase.js (firebase)
  67.4 KB - ui-components.js (ui)
  45.1 KB - main.js (main)

💰 Budget Analysis
  ✅ First Load JS: 245.2 KB / 300 KB budget
  ✅ Total CSS: 32.1 KB / 100 KB budget
  🎉 All budgets are within limits!
```

### JSON Reports

Structured data for automation:

```json
{
  "buildId": "build-2024-03-15T02:00:00-000Z",
  "timestamp": "2024-03-15T02:00:00.000Z",
  "summary": {
    "firstLoadJSKB": 245.2,
    "totalCSSSizeKB": 32.1,
    "totalMediaSizeKB": 156.3
  },
  "budgets": { /* Budget configuration */ },
  "violations": [],
  "warnings": []
}
```

## Monitoring and Alerts

### Performance Budgets in CI

Budget violations will:
- ❌ Fail the CI build
- 📊 Generate detailed reports
- 💡 Provide optimization suggestions
- 📈 Track trends over time

### Trend Analysis

Track bundle size trends:

```bash
# Create baseline after optimizations
npm run bundle:compare -- --update-baseline

# Regular comparison in CI
npm run bundle:compare
```

## Optimization Recommendations

The system provides contextual suggestions:

### First Load JS Violations
- Use `React.lazy()` for component-level code splitting
- Move non-critical code to separate chunks
- Consider dynamic imports for heavy libraries

### CSS Size Issues
- Remove unused CSS with PurgeCSS
- Use CSS modules for better tree shaking
- Extract critical CSS for above-the-fold content

### Large Chunks
- Audit dependencies with `npm ls`
- Consider lighter alternatives
- Optimize import patterns

### Asset Optimization
- Use `next/image` with WebP format
- Implement lazy loading
- Consider CDN for static assets

## Troubleshooting

### Common Issues

**"Bundle stats not found"**
```bash
# Run build first
npm run build
npm run bundle:analyze
```

**"No baseline found"**
```bash
# Create initial baseline
npm run bundle:compare
# Make changes, then compare again
npm run bundle:compare
```

**Large framework chunk**
```bash
# Check for duplicate React versions
npm ls react react-dom
# Optimize imports
npm run build:analyze  # Opens webpack-bundle-analyzer
```

### Debug Mode

For detailed analysis:

```bash
# Interactive webpack analyzer
ANALYZE=true npm run build

# Verbose bundle analysis
node scripts/bundle-analyzer.js --verbose

# Debug webpack plugin
DEBUG=bundle-size npm run build
```

## Best Practices

### Development Workflow

1. **Baseline Creation** - Create baseline before feature work
2. **Regular Monitoring** - Check bundle size during development
3. **Pre-commit Validation** - Run budget checks before commits
4. **PR Analysis** - Compare bundle sizes in pull requests

### Performance Targets

- **First Load JS < 250 KB** - Critical for initial performance
- **Page-specific JS < 50 KB** - Fast navigation between pages
- **CSS < 50 KB** - Quick initial render
- **Images optimized** - WebP, lazy loading, proper sizing

### Code Organization

```javascript
// Good: Specific imports for better tree shaking
import { Button } from '@radix-ui/react-button';
import { CheckIcon } from 'lucide-react';

// Avoid: Barrel imports that include unused code
import * as RadixUI from '@radix-ui/react';
import * as LucideIcons from 'lucide-react';
```

## Integration Examples

### Package.json Scripts

```json
{
  "scripts": {
    "analyze": "npm run build && npm run bundle:analyze",
    "size-check": "npm run bundle:budget",
    "size-compare": "npm run bundle:compare",
    "optimize": "npm run build:analyze && npm run size-check"
  }
}
```

### VS Code Tasks

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Bundle Analysis",
      "type": "shell",
      "command": "npm run bundle:analyze",
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

## Future Enhancements

- **Historical Trending** - Track bundle size over time
- **Dependency Impact Analysis** - Show which dependencies contribute most to size
- **Automated Optimization** - Suggest specific code changes
- **Integration with Performance Metrics** - Correlate bundle size with real-world performance
- **Team Notifications** - Slack/Discord alerts for budget violations

---

For questions or suggestions, see the bundle analyzer scripts or create an issue in the project repository.