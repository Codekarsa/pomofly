#!/usr/bin/env node

/**
 * Bundle Budget Checker
 * Validates bundle sizes against defined budgets and fails CI if exceeded
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Bundle size budgets (in KB)
const BUDGETS = {
  // Core bundles
  firstLoadJS: {
    warning: 250,
    error: 300,
  },
  totalJS: {
    warning: 500,
    error: 800,
  },
  totalCSS: {
    warning: 50,
    error: 100,
  },
  
  // Individual chunks
  chunks: {
    framework: {
      warning: 150,
      error: 200,
    },
    vendor: {
      warning: 100,
      error: 150,
    },
    page: {
      warning: 50,
      error: 100,
    },
    ui: {
      warning: 80,
      error: 120,
    },
    firebase: {
      warning: 100,
      error: 150,
    },
  },
  
  // Asset types
  assets: {
    images: {
      warning: 500,
      error: 1000,
    },
    fonts: {
      warning: 100,
      error: 200,
    },
  },
};

class BudgetChecker {
  constructor() {
    this.violations = [];
    this.warnings = [];
    this.stats = null;
  }

  async check() {
    try {
      await this.loadStats();
      this.checkBudgets();
      this.generateReport();
      this.exit();
    } catch (error) {
      console.error(`${colors.red}❌ Budget check failed:${colors.reset}`, error.message);
      process.exit(1);
    }
  }

  async loadStats() {
    const statsPath = 'bundle-stats.json';
    
    if (!fs.existsSync(statsPath)) {
      throw new Error('Bundle stats not found. Run "npm run bundle:analyze:json" first.');
    }

    this.stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  }

  checkBudgets() {
    console.log(`${colors.bold}💰 Checking Bundle Budgets${colors.reset}\n`);

    // Check first load JS budget
    this.checkMetric(
      'First Load JS',
      this.stats.summary?.firstLoadJSKB,
      BUDGETS.firstLoadJS,
      'Critical for initial page load performance'
    );

    // Check total CSS budget
    this.checkMetric(
      'Total CSS',
      this.stats.summary?.totalCSSSizeKB,
      BUDGETS.totalCSS,
      'Affects initial render performance'
    );

    // Check individual chunks if available from webpack report
    this.checkWebpackChunks();

    // Check asset budgets if available
    this.checkAssetBudgets();
  }

  checkMetric(name, actualKB, budget, description) {
    if (actualKB === undefined || actualKB === null) {
      console.log(`${colors.gray}⏭️  ${name}: No data available${colors.reset}`);
      return;
    }

    const status = this.getBudgetStatus(actualKB, budget);
    const icon = this.getStatusIcon(status);
    const color = this.getStatusColor(status);
    
    console.log(`${icon} ${name}: ${color}${this.formatSize(actualKB)}${colors.reset} (budget: ${this.formatSize(budget.error)})`);
    
    if (description && status !== 'ok') {
      console.log(`   ${colors.gray}${description}${colors.reset}`);
    }

    if (status === 'error') {
      this.violations.push({
        metric: name,
        actual: actualKB,
        budget: budget.error,
        severity: 'error',
        description,
      });
    } else if (status === 'warning') {
      this.warnings.push({
        metric: name,
        actual: actualKB,
        budget: budget.warning,
        severity: 'warning',
        description,
      });
    }
  }

  checkWebpackChunks() {
    const webpackReportPath = '.next/bundle-size-report.json';
    
    if (!fs.existsSync(webpackReportPath)) {
      return;
    }

    try {
      const webpackReport = JSON.parse(fs.readFileSync(webpackReportPath, 'utf8'));
      
      console.log(`\n${colors.bold}📦 Chunk Budget Check${colors.reset}`);
      
      for (const [chunkName, chunkInfo] of Object.entries(webpackReport.chunks || {})) {
        const chunkType = this.getChunkType(chunkName);
        const budget = BUDGETS.chunks[chunkType] || BUDGETS.chunks.page;
        
        this.checkMetric(
          `Chunk: ${chunkName}`,
          chunkInfo.sizeKB,
          budget,
          `Type: ${chunkType}`
        );
      }
    } catch (error) {
      console.log(`${colors.gray}⏭️  Webpack chunks: Could not analyze (${error.message})${colors.reset}`);
    }
  }

  checkAssetBudgets() {
    if (!this.stats.summary) return;

    console.log(`\n${colors.bold}🎨 Asset Budget Check${colors.reset}`);
    
    // Check total media size as image budget
    if (this.stats.summary.totalMediaSizeKB) {
      this.checkMetric(
        'Images/Media',
        this.stats.summary.totalMediaSizeKB,
        BUDGETS.assets.images,
        'Affects page load speed'
      );
    }
  }

  getChunkType(chunkName) {
    const name = chunkName.toLowerCase();
    
    if (name.includes('framework') || name.includes('react')) return 'framework';
    if (name.includes('firebase')) return 'firebase';
    if (name.includes('ui') || name.includes('radix') || name.includes('lucide')) return 'ui';
    if (name.includes('vendor') || name.includes('node_modules')) return 'vendor';
    
    return 'page';
  }

  getBudgetStatus(actualKB, budget) {
    if (actualKB > budget.error) return 'error';
    if (actualKB > budget.warning) return 'warning';
    return 'ok';
  }

  getStatusIcon(status) {
    switch (status) {
      case 'ok': return '✅';
      case 'warning': return '⚠️ ';
      case 'error': return '❌';
      default: return '❓';
    }
  }

  getStatusColor(status) {
    switch (status) {
      case 'ok': return colors.green;
      case 'warning': return colors.yellow;
      case 'error': return colors.red;
      default: return colors.gray;
    }
  }

  formatSize(sizeKB) {
    if (sizeKB >= 1024) {
      return `${Math.round(sizeKB / 1024 * 100) / 100} MB`;
    }
    return `${sizeKB} KB`;
  }

  generateReport() {
    console.log(`\n${colors.bold}📊 Budget Report Summary${colors.reset}`);
    
    const totalViolations = this.violations.length;
    const totalWarnings = this.warnings.length;
    
    if (totalViolations === 0 && totalWarnings === 0) {
      console.log(`${colors.green}🎉 All bundles are within budget limits!${colors.reset}`);
      return;
    }

    if (totalViolations > 0) {
      console.log(`\n${colors.red}🚨 Budget Violations (${totalViolations}):${colors.reset}`);
      for (const violation of this.violations) {
        const overage = Math.round((violation.actual - violation.budget) * 100) / 100;
        console.log(`  ❌ ${violation.metric}: ${this.formatSize(violation.actual)} (${this.formatSize(overage)} over budget)`);
      }
    }

    if (totalWarnings > 0) {
      console.log(`\n${colors.yellow}⚠️  Budget Warnings (${totalWarnings}):${colors.reset}`);
      for (const warning of this.warnings) {
        const overage = Math.round((warning.actual - warning.budget) * 100) / 100;
        console.log(`  ⚠️  ${warning.metric}: ${this.formatSize(warning.actual)} (${this.formatSize(overage)} over warning threshold)`);
      }
    }

    // Provide optimization suggestions
    this.printOptimizationSuggestions();

    // Save detailed report
    this.saveBudgetReport();
  }

  printOptimizationSuggestions() {
    console.log(`\n${colors.bold}💡 Optimization Suggestions${colors.reset}`);
    
    const suggestions = [];
    
    if (this.violations.some(v => v.metric.includes('First Load JS'))) {
      suggestions.push('• Consider code splitting with dynamic imports');
      suggestions.push('• Move non-critical code to separate chunks');
      suggestions.push('• Use React.lazy() for component-level code splitting');
    }
    
    if (this.violations.some(v => v.metric.includes('CSS'))) {
      suggestions.push('• Remove unused CSS with PurgeCSS or similar tools');
      suggestions.push('• Consider critical CSS extraction');
      suggestions.push('• Use CSS modules or styled-components for better tree shaking');
    }
    
    if (this.violations.some(v => v.metric.includes('vendor') || v.metric.includes('framework'))) {
      suggestions.push('• Audit dependencies with npm-bundle-size or bundlesize');
      suggestions.push('• Consider lighter alternatives to heavy libraries');
      suggestions.push('• Use tree shaking to eliminate unused code');
    }
    
    if (this.violations.some(v => v.metric.includes('Images') || v.metric.includes('Media'))) {
      suggestions.push('• Optimize images with next/image and WebP format');
      suggestions.push('• Implement lazy loading for non-critical images');
      suggestions.push('• Consider using a CDN for static assets');
    }

    if (suggestions.length === 0) {
      suggestions.push('• Use webpack-bundle-analyzer for detailed analysis');
      suggestions.push('• Profile your app to identify performance bottlenecks');
    }

    suggestions.forEach(suggestion => console.log(`  ${suggestion}`));
  }

  saveBudgetReport() {
    const report = {
      timestamp: new Date().toISOString(),
      status: this.violations.length > 0 ? 'failed' : (this.warnings.length > 0 ? 'warning' : 'passed'),
      summary: {
        violations: this.violations.length,
        warnings: this.warnings.length,
        total: this.violations.length + this.warnings.length,
      },
      budgets: BUDGETS,
      violations: this.violations,
      warnings: this.warnings,
      stats: this.stats?.summary,
    };

    fs.writeFileSync('budget-report.json', JSON.stringify(report, null, 2));
    console.log(`\n${colors.gray}📄 Detailed report saved to budget-report.json${colors.reset}`);
  }

  exit() {
    if (this.violations.length > 0) {
      console.log(`\n${colors.red}💥 Bundle budget check failed with ${this.violations.length} violation(s)${colors.reset}`);
      process.exit(1);
    } else if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}⚠️  Bundle budget check passed with ${this.warnings.length} warning(s)${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.green}✅ Bundle budget check passed!${colors.reset}`);
      process.exit(0);
    }
  }
}

// CLI interface
if (require.main === module) {
  const checker = new BudgetChecker();
  checker.check();
}

module.exports = { BudgetChecker, BUDGETS };