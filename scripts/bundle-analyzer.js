#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Analyzes Next.js build output to provide bundle size insights
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Bundle size budgets in KB
const BUDGETS = {
  firstLoadJS: 250, // Initial JS bundle size limit
  chunks: {
    small: 50,   // Small chunks (individual pages)
    medium: 100, // Medium chunks (shared libraries)
    large: 200,  // Large chunks (main framework)
  },
  css: 50,       // CSS bundle size limit
  fonts: 100,    // Font assets limit
  images: 500,   // Image assets limit per page
};

class BundleAnalyzer {
  constructor() {
    this.buildManifest = null;
    this.buildId = null;
    this.stats = {
      pages: {},
      chunks: {},
      assets: {},
      summary: {},
    };
  }

  async analyze() {
    try {
      console.log(`${colors.bold}🔍 Bundle Size Analysis${colors.reset}\n`);
      
      // Check if build exists
      if (!fs.existsSync('.next')) {
        console.log(`${colors.red}❌ No build found. Run 'next build' first.${colors.reset}`);
        process.exit(1);
      }

      await this.loadBuildManifest();
      await this.analyzeBuildOutput();
      this.generateReport();
      this.checkBudgets();
      
      console.log(`\n${colors.green}✅ Bundle analysis complete!${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}❌ Analysis failed:${colors.reset}`, error.message);
      process.exit(1);
    }
  }

  async loadBuildManifest() {
    const manifestPath = '.next/build-manifest.json';
    const buildIdPath = '.next/BUILD_ID';

    if (!fs.existsSync(manifestPath)) {
      throw new Error('Build manifest not found');
    }

    this.buildManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    this.buildId = fs.existsSync(buildIdPath) ? 
      fs.readFileSync(buildIdPath, 'utf8').trim() : 
      'unknown';
  }

  async analyzeBuildOutput() {
    const staticPath = '.next/static';
    
    if (!fs.existsSync(staticPath)) {
      throw new Error('Static build output not found');
    }

    // Analyze JavaScript chunks
    await this.analyzeJavaScriptChunks(staticPath);
    
    // Analyze CSS files
    await this.analyzeCSSFiles(staticPath);
    
    // Analyze other assets
    await this.analyzeOtherAssets(staticPath);
    
    // Analyze pages
    this.analyzePages();
  }

  async analyzeJavaScriptChunks(staticPath) {
    const chunksPath = path.join(staticPath, 'chunks');
    
    if (fs.existsSync(chunksPath)) {
      const chunks = fs.readdirSync(chunksPath);
      
      for (const chunk of chunks) {
        if (chunk.endsWith('.js')) {
          const chunkPath = path.join(chunksPath, chunk);
          const stats = fs.statSync(chunkPath);
          const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
          
          this.stats.chunks[chunk] = {
            path: chunkPath,
            size: stats.size,
            sizeKB,
            type: this.categorizeChunk(chunk),
          };
        }
      }
    }

    // Analyze main JS files
    const jsPath = path.join(staticPath, 'js');
    if (fs.existsSync(jsPath)) {
      const jsFiles = fs.readdirSync(jsPath);
      
      for (const file of jsFiles) {
        if (file.endsWith('.js')) {
          const filePath = path.join(jsPath, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
          
          this.stats.chunks[file] = {
            path: filePath,
            size: stats.size,
            sizeKB,
            type: 'main',
          };
        }
      }
    }
  }

  async analyzeCSSFiles(staticPath) {
    const cssPath = path.join(staticPath, 'css');
    
    if (fs.existsSync(cssPath)) {
      const cssFiles = fs.readdirSync(cssPath);
      let totalCSSSize = 0;
      
      for (const file of cssFiles) {
        if (file.endsWith('.css')) {
          const filePath = path.join(cssPath, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
          totalCSSSize += stats.size;
          
          this.stats.assets[file] = {
            path: filePath,
            size: stats.size,
            sizeKB,
            type: 'css',
          };
        }
      }
      
      this.stats.summary.totalCSSSize = totalCSSSize;
      this.stats.summary.totalCSSSizeKB = Math.round(totalCSSSize / 1024 * 100) / 100;
    }
  }

  async analyzeOtherAssets(staticPath) {
    const mediaPath = path.join(staticPath, 'media');
    
    if (fs.existsSync(mediaPath)) {
      const mediaFiles = fs.readdirSync(mediaPath);
      let totalMediaSize = 0;
      
      for (const file of mediaFiles) {
        const filePath = path.join(mediaPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
        totalMediaSize += stats.size;
        
        this.stats.assets[file] = {
          path: filePath,
          size: stats.size,
          sizeKB,
          type: this.getAssetType(file),
        };
      }
      
      this.stats.summary.totalMediaSize = totalMediaSize;
      this.stats.summary.totalMediaSizeKB = Math.round(totalMediaSize / 1024 * 100) / 100;
    }
  }

  analyzePages() {
    if (this.buildManifest.pages) {
      let totalFirstLoadJS = 0;
      
      for (const [pagePath, assets] of Object.entries(this.buildManifest.pages)) {
        let pageJS = 0;
        let pageCSS = 0;
        
        for (const asset of assets) {
          const assetPath = path.join('.next', asset);
          if (fs.existsSync(assetPath)) {
            const stats = fs.statSync(assetPath);
            if (asset.endsWith('.js')) {
              pageJS += stats.size;
            } else if (asset.endsWith('.css')) {
              pageCSS += stats.size;
            }
          }
        }
        
        this.stats.pages[pagePath] = {
          assets: assets.length,
          jsSize: pageJS,
          jsSizeKB: Math.round(pageJS / 1024 * 100) / 100,
          cssSize: pageCSS,
          cssSizeKB: Math.round(pageCSS / 1024 * 100) / 100,
          firstLoadJS: pageJS, // Simplified calculation
        };
        
        if (pagePath === '/') {
          totalFirstLoadJS = pageJS;
        }
      }
      
      this.stats.summary.firstLoadJS = totalFirstLoadJS;
      this.stats.summary.firstLoadJSKB = Math.round(totalFirstLoadJS / 1024 * 100) / 100;
    }
  }

  categorizeChunk(filename) {
    if (filename.includes('webpack')) return 'webpack';
    if (filename.includes('framework')) return 'framework';
    if (filename.includes('main')) return 'main';
    if (filename.includes('pages')) return 'pages';
    if (filename.includes('vendors') || filename.includes('node_modules')) return 'vendor';
    return 'unknown';
  }

  getAssetType(filename) {
    const ext = path.extname(filename).toLowerCase();
    if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) return 'font';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) return 'image';
    return 'other';
  }

  generateReport() {
    console.log(`${colors.bold}📊 Bundle Analysis Report${colors.reset}`);
    console.log(`${colors.gray}Build ID: ${this.buildId}${colors.reset}\n`);

    // Summary
    console.log(`${colors.bold}📋 Summary${colors.reset}`);
    if (this.stats.summary.firstLoadJSKB) {
      console.log(`  First Load JS: ${this.formatSize(this.stats.summary.firstLoadJSKB)}`);
    }
    if (this.stats.summary.totalCSSSizeKB) {
      console.log(`  Total CSS: ${this.formatSize(this.stats.summary.totalCSSSizeKB)}`);
    }
    if (this.stats.summary.totalMediaSizeKB) {
      console.log(`  Total Media: ${this.formatSize(this.stats.summary.totalMediaSizeKB)}`);
    }
    console.log();

    // Top JavaScript chunks
    console.log(`${colors.bold}📦 Largest JavaScript Chunks${colors.reset}`);
    const sortedChunks = Object.entries(this.stats.chunks)
      .sort(([,a], [,b]) => b.sizeKB - a.sizeKB)
      .slice(0, 10);

    for (const [name, info] of sortedChunks) {
      const color = this.getSizeColor(info.sizeKB, 'chunk');
      console.log(`  ${color}${this.formatSize(info.sizeKB)}${colors.reset} - ${name} (${info.type})`);
    }
    console.log();

    // Pages analysis
    if (Object.keys(this.stats.pages).length > 0) {
      console.log(`${colors.bold}📄 Pages Analysis${colors.reset}`);
      
      for (const [pagePath, pageInfo] of Object.entries(this.stats.pages)) {
        const color = this.getSizeColor(pageInfo.jsSizeKB, 'page');
        console.log(`  ${pagePath}`);
        console.log(`    JS: ${color}${this.formatSize(pageInfo.jsSizeKB)}${colors.reset}`);
        if (pageInfo.cssSizeKB > 0) {
          console.log(`    CSS: ${this.formatSize(pageInfo.cssSizeKB)}`);
        }
      }
      console.log();
    }

    // Asset breakdown
    const assetsByType = this.groupAssetsByType();
    if (Object.keys(assetsByType).length > 0) {
      console.log(`${colors.bold}🎨 Assets by Type${colors.reset}`);
      for (const [type, assets] of Object.entries(assetsByType)) {
        const totalSize = assets.reduce((sum, asset) => sum + asset.sizeKB, 0);
        console.log(`  ${type}: ${this.formatSize(totalSize)} (${assets.length} files)`);
      }
      console.log();
    }
  }

  groupAssetsByType() {
    const groups = {};
    
    for (const [name, asset] of Object.entries(this.stats.assets)) {
      if (!groups[asset.type]) {
        groups[asset.type] = [];
      }
      groups[asset.type].push({ name, ...asset });
    }
    
    return groups;
  }

  checkBudgets() {
    console.log(`${colors.bold}💰 Budget Analysis${colors.reset}`);
    let budgetViolations = 0;

    // Check first load JS budget
    if (this.stats.summary.firstLoadJSKB) {
      const firstLoadJS = this.stats.summary.firstLoadJSKB;
      const status = firstLoadJS <= BUDGETS.firstLoadJS;
      const icon = status ? '✅' : '❌';
      const color = status ? colors.green : colors.red;
      
      if (!status) budgetViolations++;
      
      console.log(`  ${icon} First Load JS: ${color}${this.formatSize(firstLoadJS)}${colors.reset} / ${this.formatSize(BUDGETS.firstLoadJS)} budget`);
    }

    // Check CSS budget
    if (this.stats.summary.totalCSSSizeKB) {
      const totalCSS = this.stats.summary.totalCSSSizeKB;
      const status = totalCSS <= BUDGETS.css;
      const icon = status ? '✅' : '❌';
      const color = status ? colors.green : colors.red;
      
      if (!status) budgetViolations++;
      
      console.log(`  ${icon} Total CSS: ${color}${this.formatSize(totalCSS)}${colors.reset} / ${this.formatSize(BUDGETS.css)} budget`);
    }

    // Check large chunks
    const largeChunks = Object.entries(this.stats.chunks)
      .filter(([, info]) => info.sizeKB > BUDGETS.chunks.large);

    if (largeChunks.length > 0) {
      budgetViolations++;
      console.log(`  ❌ Large chunks detected (>${this.formatSize(BUDGETS.chunks.large)}):`);
      for (const [name, info] of largeChunks) {
        console.log(`    ${colors.red}${this.formatSize(info.sizeKB)}${colors.reset} - ${name}`);
      }
    } else {
      console.log(`  ✅ No chunks exceed large size budget (${this.formatSize(BUDGETS.chunks.large)})`);
    }

    console.log();

    if (budgetViolations > 0) {
      console.log(`${colors.red}⚠️  ${budgetViolations} budget violation(s) found!${colors.reset}`);
      console.log(`${colors.yellow}💡 Consider code splitting, lazy loading, or removing unused dependencies.${colors.reset}`);
    } else {
      console.log(`${colors.green}🎉 All budgets are within limits!${colors.reset}`);
    }
  }

  getSizeColor(sizeKB, type) {
    const thresholds = {
      chunk: BUDGETS.chunks,
      page: { small: 100, medium: 200, large: 300 },
    };

    const threshold = thresholds[type] || thresholds.chunk;
    
    if (sizeKB <= threshold.small) return colors.green;
    if (sizeKB <= threshold.medium) return colors.yellow;
    if (sizeKB <= threshold.large) return colors.yellow;
    return colors.red;
  }

  formatSize(sizeKB) {
    if (sizeKB >= 1024) {
      return `${Math.round(sizeKB / 1024 * 100) / 100} MB`;
    }
    return `${sizeKB} KB`;
  }
}

// Export stats for CI integration
function exportStatsJSON() {
  const analyzer = new BundleAnalyzer();
  
  if (!fs.existsSync('.next')) {
    console.error('No build found. Run next build first.');
    process.exit(1);
  }

  analyzer.loadBuildManifest();
  analyzer.analyzeBuildOutput();

  const output = {
    buildId: analyzer.buildId,
    timestamp: new Date().toISOString(),
    summary: analyzer.stats.summary,
    budgets: BUDGETS,
    violations: [],
  };

  // Check budgets and record violations
  if (analyzer.stats.summary.firstLoadJSKB > BUDGETS.firstLoadJS) {
    output.violations.push({
      type: 'firstLoadJS',
      actual: analyzer.stats.summary.firstLoadJSKB,
      budget: BUDGETS.firstLoadJS,
    });
  }

  if (analyzer.stats.summary.totalCSSSizeKB > BUDGETS.css) {
    output.violations.push({
      type: 'totalCSS',
      actual: analyzer.stats.summary.totalCSSSizeKB,
      budget: BUDGETS.css,
    });
  }

  fs.writeFileSync('bundle-stats.json', JSON.stringify(output, null, 2));
  console.log('Bundle stats exported to bundle-stats.json');
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--json')) {
    exportStatsJSON();
  } else {
    const analyzer = new BundleAnalyzer();
    analyzer.analyze();
  }
}

module.exports = { BundleAnalyzer, BUDGETS };