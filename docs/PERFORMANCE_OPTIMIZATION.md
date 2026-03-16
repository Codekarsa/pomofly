# Performance Optimization Guide

Quick reference for optimizing bundle sizes and application performance in Pomofly.

## Quick Wins

### 🎯 Immediate Optimizations

```bash
# 1. Analyze current bundle
npm run bundle:analyze

# 2. Check specific imports
npm run build:analyze  # Opens webpack-bundle-analyzer

# 3. Fix common issues
npm run bundle:budget
```

### 📦 Import Optimization

```javascript
// ✅ Good: Specific imports
import { Button } from '@radix-ui/react-button';
import { CheckIcon } from 'lucide-react';

// ❌ Bad: Barrel imports
import * as RadixUI from '@radix-ui/react';
import * as Icons from 'lucide-react';

// ✅ Good: Conditional imports
const AdminPanel = lazy(() => import('./AdminPanel'));

// ❌ Bad: Eager loading of heavy components
import AdminPanel from './AdminPanel';
```

### 🔄 Code Splitting Patterns

```javascript
// Page-level splitting
const HeavyPage = lazy(() => import('./HeavyPage'));

// Component-level splitting
const Chart = lazy(() => import('./Chart'));

// Feature-level splitting
const AdvancedFeatures = lazy(() => 
  import('./AdvancedFeatures').then(module => ({
    default: module.AdvancedFeatures
  }))
);

// Third-party library splitting
const moment = lazy(() => import('moment'));
```

## Bundle Analysis Workflow

### 1. Before Development
```bash
# Create baseline
npm run bundle:compare
```

### 2. During Development
```bash
# Quick check
npm run bundle:analyze

# Interactive analysis
ANALYZE=true npm run dev
```

### 3. Before Commit
```bash
# Budget validation
npm run bundle:budget

# Compare changes
npm run bundle:compare
```

## Common Issues & Solutions

### 🚨 Large First Load JS

**Symptoms:**
- First Load JS > 250 KB
- Slow initial page load

**Solutions:**
```javascript
// Move heavy imports to lazy loading
const HeavyChart = lazy(() => import('./HeavyChart'));
const AdminDashboard = lazy(() => import('./AdminDashboard'));

// Use dynamic imports for conditional features
if (isAdmin) {
  const { AdminTools } = await import('./AdminTools');
  return <AdminTools />;
}

// Split Firebase imports
const auth = () => import('firebase/auth');
const firestore = () => import('firebase/firestore');
```

### 📊 Large UI Component Bundle

**Symptoms:**
- UI components chunk > 80 KB
- Multiple Radix UI components imported

**Solutions:**
```javascript
// ✅ Import only what you need
import { Button } from '@radix-ui/react-button';
import { Dialog } from '@radix-ui/react-dialog';

// ✅ Use icon tree shaking
import { Check, X, Menu } from 'lucide-react';

// ❌ Avoid full library imports
import * as RadixUI from '@radix-ui/react';
import * as LucideReact from 'lucide-react';
```

### 🔥 Large Firebase Bundle

**Symptoms:**
- Firebase chunk > 100 KB
- Multiple Firebase products imported

**Solutions:**
```javascript
// ✅ Modular imports
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ✅ Conditional Firebase features
const enableAnalytics = async () => {
  if (process.env.NODE_ENV === 'production') {
    const { getAnalytics } = await import('firebase/analytics');
    return getAnalytics();
  }
};

// ✅ Lazy load Firebase UI
const FirebaseUI = lazy(() => import('react-firebaseui'));
```

### 🎨 Large CSS Bundle

**Symptoms:**
- Total CSS > 50 KB
- Unused styles included

**Solutions:**
```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    optimizeCss: true,
  },
};

// Tailwind purging (tailwind.config.js)
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // Enable JIT mode for smaller builds
  mode: 'jit',
};
```

## Optimization Checklist

### ✅ Code Splitting
- [ ] Heavy components are lazy-loaded
- [ ] Admin/authenticated features are split
- [ ] Third-party libraries use dynamic imports
- [ ] Charts/visualizations are lazy-loaded

### ✅ Import Optimization
- [ ] Using specific imports (no barrel imports)
- [ ] Tree shaking enabled for UI libraries
- [ ] Firebase products imported modularly
- [ ] Icons imported individually

### ✅ Asset Optimization
- [ ] Images use next/image with WebP
- [ ] Fonts are optimized and subset
- [ ] SVGs are inlined or optimized
- [ ] Static assets use proper caching

### ✅ Dependency Audit
- [ ] No duplicate dependencies
- [ ] Unused dependencies removed
- [ ] Large dependencies justified
- [ ] Alternative lightweight libraries considered

## Performance Budget Guidelines

### 🎯 Target Sizes

| Bundle Type | Target | Warning | Error |
|-------------|--------|---------|-------|
| First Load JS | < 200 KB | 250 KB | 300 KB |
| Page JS | < 30 KB | 50 KB | 100 KB |
| Total CSS | < 30 KB | 50 KB | 100 KB |
| Images/Page | < 300 KB | 500 KB | 1 MB |

### 📱 Mobile Performance

```javascript
// Optimize for mobile
const isMobile = window.innerWidth < 768;

// Load mobile-specific optimizations
if (isMobile) {
  const { MobileOptimizations } = await import('./MobileOptimizations');
}

// Reduce image sizes on mobile
<Image
  src="/hero.jpg"
  sizes="(max-width: 768px) 100vw, 50vw"
  priority
/>
```

## Monitoring Tools

### Development
```bash
# Interactive bundle analyzer
npm run build:analyze

# Lighthouse CI
npx lighthouse https://localhost:3000 --view

# Size comparison
npm run bundle:compare
```

### Production
```bash
# Bundle budget CI check
npm run bundle:budget

# Performance monitoring
npm run pwa:test
```

## Quick Commands Reference

```bash
# Bundle analysis
npm run bundle:analyze          # Analyze current build
npm run bundle:analyze:json     # Export JSON report
npm run bundle:budget           # Check budgets (CI)
npm run bundle:compare          # Compare with baseline
npm run build:analyze           # Interactive webpack analyzer

# Development
ANALYZE=true npm run dev        # Dev with analyzer
npm run bundle:size             # Full analysis workflow

# Baseline management
npm run bundle:compare -- --update-baseline
```

## Advanced Optimizations

### Custom Webpack Configuration

```javascript
// next.config.mjs
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Bundle splitting optimization
    config.optimization.splitChunks.cacheGroups.vendor = {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      chunks: 'all',
      minSize: 20000,
      maxSize: 100000,
    };

    // Moment.js optimization
    config.resolve.alias.moment$ = 'moment/moment.js';

    // Lodash optimization
    config.resolve.alias.lodash = 'lodash-es';

    return config;
  },
};
```

### Component-Level Optimization

```javascript
// Use React.memo for expensive components
const ExpensiveComponent = memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});

// Use useMemo for expensive calculations
const processedData = useMemo(() => {
  return heavyDataProcessing(rawData);
}, [rawData]);

// Use lazy loading with Suspense
const LazyChart = lazy(() => import('./Chart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyChart data={data} />
    </Suspense>
  );
}
```

---

For more detailed information, see the [Bundle Size Analysis Documentation](./BUNDLE_SIZE_ANALYSIS.md).