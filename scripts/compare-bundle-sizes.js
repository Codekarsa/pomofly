#!/usr/bin/env node

/**
 * Bundle Size Comparison Tool
 * Compares current bundle sizes with previous build or baseline
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

class BundleComparator {
  constructor() {
    this.currentStats = null;
    this.previousStats = null;
    this.comparison = {
      added: [],
      removed: [],
      changed: [],
      unchanged: [],
      summary: {},
    };
  }

  async compare(previousPath = 'bundle-stats-baseline.json', currentPath = 'bundle-stats.json') {
    try {
      await this.loadStats(currentPath, previousPath);
      this.compareStats();
      this.generateReport();
      this.saveComparison();
    } catch (error) {
      console.error(`${colors.red}❌ Comparison failed:${colors.reset}`, error.message);
      process.exit(1);
    }
  }

  async loadStats(currentPath, previousPath) {
    // Load current stats
    if (!fs.existsSync(currentPath)) {
      throw new Error(`Current stats file not found: ${currentPath}. Run bundle analysis first.`);
    }
    
    this.currentStats = JSON.parse(fs.readFileSync(currentPath, 'utf8'));

    // Load previous stats (optional)
    if (fs.existsSync(previousPath)) {
      this.previousStats = JSON.parse(fs.readFileSync(previousPath, 'utf8'));
    } else {
      console.log(`${colors.yellow}⚠️  No baseline found at ${previousPath}. Creating new baseline.${colors.reset}`);
      
      // Create baseline from current stats
      this.createBaseline(currentPath, previousPath);
      return;
    }
  }

  createBaseline(currentPath, baselinePath) {
    fs.copyFileSync(currentPath, baselinePath);
    console.log(`${colors.green}✅ Baseline created at ${baselinePath}${colors.reset}`);
    console.log(`${colors.blue}💡 Run this command again after your next build to see the comparison.${colors.reset}`);
  }

  compareStats() {
    console.log(`${colors.bold}📊 Bundle Size Comparison${colors.reset}\n`);

    // Compare summary metrics
    this.compareSummaryMetrics();

    // Compare webpack chunks if available
    this.compareWebpackChunks();

    // Generate overall summary
    this.generateComparisonSummary();
  }

  compareSummaryMetrics() {
    console.log(`${colors.bold}📋 Summary Comparison${colors.reset}`);

    const metrics = [
      { key: 'firstLoadJSKB', name: 'First Load JS' },
      { key: 'totalCSSSizeKB', name: 'Total CSS' },
      { key: 'totalMediaSizeKB', name: 'Total Media' },
    ];

    for (const metric of metrics) {
      const current = this.currentStats.summary?.[metric.key];
      const previous = this.previousStats.summary?.[metric.key];

      if (current !== undefined && previous !== undefined) {
        this.compareMetric(metric.name, current, previous);
      }
    }

    console.log();
  }

  compareMetric(name, current, previous) {
    const diff = current - previous;
    const percentChange = previous > 0 ? (diff / previous) * 100 : 0;
    
    const icon = this.getChangeIcon(diff);
    const color = this.getChangeColor(diff);
    
    const diffStr = diff > 0 ? `+${this.formatSize(diff)}` : this.formatSize(diff);
    const percentStr = percentChange !== 0 ? ` (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%)` : '';
    
    console.log(`${icon} ${name}: ${this.formatSize(current)} ${color}${diffStr}${percentStr}${colors.reset}`);
  }

  compareWebpackChunks() {
    const currentWebpackPath = '.next/bundle-size-report.json';
    const previousWebpackPath = '.next/bundle-size-report-baseline.json';
    
    if (!fs.existsSync(currentWebpackPath)) {
      return;
    }

    let currentWebpack, previousWebpack;
    
    try {
      currentWebpack = JSON.parse(fs.readFileSync(currentWebpackPath, 'utf8'));
      
      if (fs.existsSync(previousWebpackPath)) {
        previousWebpack = JSON.parse(fs.readFileSync(previousWebpackPath, 'utf8'));
      } else {
        // Create baseline
        fs.copyFileSync(currentWebpackPath, previousWebpackPath);
        return;
      }
    } catch (error) {
      console.log(`${colors.gray}⏭️  Webpack comparison: Could not load data${colors.reset}`);
      return;
    }

    console.log(`${colors.bold}📦 Chunk Comparison${colors.reset}`);

    const currentChunks = currentWebpack.chunks || {};
    const previousChunks = previousWebpack.chunks || {};
    
    const allChunkNames = new Set([
      ...Object.keys(currentChunks),
      ...Object.keys(previousChunks)
    ]);

    for (const chunkName of Array.from(allChunkNames).sort()) {
      const current = currentChunks[chunkName];
      const previous = previousChunks[chunkName];

      if (current && previous) {
        // Changed chunk
        this.compareMetric(`Chunk: ${chunkName}`, current.sizeKB, previous.sizeKB);
      } else if (current && !previous) {
        // New chunk
        console.log(`${colors.green}+ Chunk: ${chunkName}: ${this.formatSize(current.sizeKB)} (new)${colors.reset}`);
        this.comparison.added.push({ type: 'chunk', name: chunkName, size: current.sizeKB });
      } else if (!current && previous) {
        // Removed chunk
        console.log(`${colors.red}- Chunk: ${chunkName}: ${this.formatSize(previous.sizeKB)} (removed)${colors.reset}`);
        this.comparison.removed.push({ type: 'chunk', name: chunkName, size: previous.sizeKB });
      }
    }

    console.log();
  }

  getChangeIcon(diff) {
    if (diff > 0) return '📈';
    if (diff < 0) return '📉';
    return '➡️ ';
  }

  getChangeColor(diff) {
    if (diff > 0) return colors.red;
    if (diff < 0) return colors.green;
    return colors.gray;
  }

  formatSize(sizeKB) {
    if (Math.abs(sizeKB) >= 1024) {
      return `${Math.round(sizeKB / 1024 * 100) / 100} MB`;
    }
    return `${Math.round(sizeKB * 100) / 100} KB`;
  }

  generateComparisonSummary() {
    const current = this.currentStats.summary || {};
    const previous = this.previousStats.summary || {};

    // Calculate total size changes
    const totalCurrentSize = (current.firstLoadJSKB || 0) + (current.totalCSSSizeKB || 0) + (current.totalMediaSizeKB || 0);
    const totalPreviousSize = (previous.firstLoadJSKB || 0) + (previous.totalCSSSizeKB || 0) + (previous.totalMediaSizeKB || 0);
    const totalDiff = totalCurrentSize - totalPreviousSize;

    this.comparison.summary = {
      totalCurrentSize,
      totalPreviousSize,
      totalDiff,
      totalPercentChange: totalPreviousSize > 0 ? (totalDiff / totalPreviousSize) * 100 : 0,
      added: this.comparison.added.length,
      removed: this.comparison.removed.length,
      changed: this.comparison.changed.length,
    };
  }

  generateReport() {
    console.log(`${colors.bold}📊 Summary${colors.reset}`);
    
    const summary = this.comparison.summary;
    
    if (summary.totalDiff !== 0) {
      const icon = this.getChangeIcon(summary.totalDiff);
      const color = this.getChangeColor(summary.totalDiff);
      const diffStr = summary.totalDiff > 0 ? `+${this.formatSize(summary.totalDiff)}` : this.formatSize(summary.totalDiff);
      const percentStr = summary.totalPercentChange !== 0 ? ` (${summary.totalPercentChange > 0 ? '+' : ''}${summary.totalPercentChange.toFixed(1)}%)` : '';
      
      console.log(`${icon} Total Bundle Size: ${this.formatSize(summary.totalCurrentSize)} ${color}${diffStr}${percentStr}${colors.reset}`);
    } else {
      console.log(`➡️  Total Bundle Size: ${this.formatSize(summary.totalCurrentSize)} (no change)`);
    }

    if (summary.added > 0) {
      console.log(`${colors.green}+ ${summary.added} new chunk(s)${colors.reset}`);
    }
    
    if (summary.removed > 0) {
      console.log(`${colors.red}- ${summary.removed} removed chunk(s)${colors.reset}`);
    }

    // Performance impact assessment
    console.log(`\n${colors.bold}⚡ Performance Impact${colors.reset}`);
    
    if (Math.abs(summary.totalDiff) < 5) {
      console.log(`${colors.green}✅ Minimal impact (< 5KB change)${colors.reset}`);
    } else if (summary.totalDiff > 0) {
      if (summary.totalDiff > 50) {
        console.log(`${colors.red}🚨 Significant increase (+${this.formatSize(summary.totalDiff)}) - consider optimization${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  Moderate increase (+${this.formatSize(summary.totalDiff)}) - monitor closely${colors.reset}`);
      }
    } else {
      console.log(`${colors.green}🎉 Bundle size reduced by ${this.formatSize(Math.abs(summary.totalDiff))}!${colors.reset}`);
    }

    // Build date comparison
    if (this.currentStats.timestamp && this.previousStats.timestamp) {
      const currentDate = new Date(this.currentStats.timestamp);
      const previousDate = new Date(this.previousStats.timestamp);
      const daysDiff = Math.round((currentDate - previousDate) / (1000 * 60 * 60 * 24));
      
      console.log(`\n${colors.gray}📅 Comparing builds from ${daysDiff} day(s) ago${colors.reset}`);
    }
  }

  saveComparison() {
    const comparisonReport = {
      timestamp: new Date().toISOString(),
      current: {
        buildId: this.currentStats.buildId,
        timestamp: this.currentStats.timestamp,
        summary: this.currentStats.summary,
      },
      previous: {
        buildId: this.previousStats.buildId,
        timestamp: this.previousStats.timestamp,
        summary: this.previousStats.summary,
      },
      comparison: this.comparison,
    };

    fs.writeFileSync('bundle-comparison.json', JSON.stringify(comparisonReport, null, 2));
    console.log(`\n${colors.gray}📄 Detailed comparison saved to bundle-comparison.json${colors.reset}`);
  }

  // Update baseline after comparison
  updateBaseline() {
    const baselinePath = 'bundle-stats-baseline.json';
    const currentPath = 'bundle-stats.json';
    
    if (fs.existsSync(currentPath)) {
      fs.copyFileSync(currentPath, baselinePath);
      console.log(`${colors.green}✅ Baseline updated${colors.reset}`);
    }

    // Update webpack baseline too
    const currentWebpackPath = '.next/bundle-size-report.json';
    const baselineWebpackPath = '.next/bundle-size-report-baseline.json';
    
    if (fs.existsSync(currentWebpackPath)) {
      fs.copyFileSync(currentWebpackPath, baselineWebpackPath);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const comparator = new BundleComparator();
  
  if (args.includes('--update-baseline')) {
    comparator.updateBaseline();
  } else if (args.includes('--help')) {
    console.log(`
Bundle Size Comparison Tool

Usage:
  node compare-bundle-sizes.js                 Compare with baseline
  node compare-bundle-sizes.js --update-baseline   Update baseline to current
  node compare-bundle-sizes.js --help         Show this help

The tool compares current bundle stats with a baseline and shows:
- Size changes for key metrics (JS, CSS, Media)
- Added/removed chunks
- Performance impact assessment
- Optimization recommendations
    `.trim());
  } else {
    comparator.compare();
  }
}

module.exports = { BundleComparator };