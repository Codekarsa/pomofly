const fs = require('fs');
const path = require('path');

/**
 * Webpack plugin to track bundle size and generate reports
 * Integrates with Next.js build process
 */
class BundleSizePlugin {
  constructor(options = {}) {
    this.options = {
      outputPath: 'bundle-size-report.json',
      threshold: {
        warning: 250 * 1024, // 250KB warning threshold
        error: 500 * 1024,   // 500KB error threshold
      },
      ...options,
    };
    
    this.stats = {
      chunks: {},
      assets: {},
      entrypoints: {},
      warnings: [],
      errors: [],
    };
  }

  apply(compiler) {
    const pluginName = 'BundleSizePlugin';

    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
      this.analyzeCompilation(compilation);
      this.generateReport(compilation);
      callback();
    });

    compiler.hooks.done.tap(pluginName, (stats) => {
      this.logResults(stats);
    });
  }

  analyzeCompilation(compilation) {
    // Reset stats
    this.stats = {
      chunks: {},
      assets: {},
      entrypoints: {},
      warnings: [],
      errors: [],
      timestamp: new Date().toISOString(),
    };

    // Analyze chunks
    for (const chunk of compilation.chunks) {
      const chunkSize = this.calculateChunkSize(chunk, compilation);
      
      this.stats.chunks[chunk.name || chunk.id] = {
        id: chunk.id,
        name: chunk.name,
        size: chunkSize,
        sizeKB: Math.round(chunkSize / 1024 * 100) / 100,
        files: Array.from(chunk.files),
        modules: chunk.getNumberOfModules(),
        entry: chunk.hasEntryModule(),
      };

      // Check thresholds
      if (chunkSize > this.options.threshold.error) {
        this.stats.errors.push({
          type: 'chunk_size',
          chunk: chunk.name || chunk.id,
          size: chunkSize,
          threshold: this.options.threshold.error,
          message: `Chunk "${chunk.name || chunk.id}" exceeds error threshold`,
        });
      } else if (chunkSize > this.options.threshold.warning) {
        this.stats.warnings.push({
          type: 'chunk_size',
          chunk: chunk.name || chunk.id,
          size: chunkSize,
          threshold: this.options.threshold.warning,
          message: `Chunk "${chunk.name || chunk.id}" exceeds warning threshold`,
        });
      }
    }

    // Analyze assets
    for (const [assetName, asset] of Object.entries(compilation.assets)) {
      const assetSize = asset.size();
      
      this.stats.assets[assetName] = {
        name: assetName,
        size: assetSize,
        sizeKB: Math.round(assetSize / 1024 * 100) / 100,
        type: this.getAssetType(assetName),
        emitted: compilation.emittedAssets.has(assetName),
      };
    }

    // Analyze entrypoints
    for (const [entrypointName, entrypoint] of compilation.entrypoints) {
      const entrypointSize = this.calculateEntrypointSize(entrypoint, compilation);
      
      this.stats.entrypoints[entrypointName] = {
        name: entrypointName,
        size: entrypointSize,
        sizeKB: Math.round(entrypointSize / 1024 * 100) / 100,
        chunks: entrypoint.chunks.map(chunk => chunk.name || chunk.id),
        assets: this.getEntrypointAssets(entrypoint),
      };
    }
  }

  calculateChunkSize(chunk, compilation) {
    let size = 0;
    
    for (const file of chunk.files) {
      if (compilation.assets[file]) {
        size += compilation.assets[file].size();
      }
    }
    
    return size;
  }

  calculateEntrypointSize(entrypoint, compilation) {
    let size = 0;
    
    for (const chunk of entrypoint.chunks) {
      size += this.calculateChunkSize(chunk, compilation);
    }
    
    return size;
  }

  getEntrypointAssets(entrypoint) {
    const assets = [];
    
    for (const chunk of entrypoint.chunks) {
      for (const file of chunk.files) {
        assets.push(file);
      }
    }
    
    return assets;
  }

  getAssetType(assetName) {
    const ext = path.extname(assetName).toLowerCase();
    
    if (ext === '.js') return 'javascript';
    if (ext === '.css') return 'stylesheet';
    if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) return 'font';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) return 'image';
    if (ext === '.json') return 'data';
    if (ext === '.map') return 'sourcemap';
    
    return 'other';
  }

  generateReport(compilation) {
    const reportData = {
      ...this.stats,
      summary: this.generateSummary(),
      buildInfo: {
        webpack: compilation.compiler.webpack?.version || 'unknown',
        mode: compilation.compiler.options.mode,
        target: compilation.compiler.options.target,
      },
    };

    const reportPath = path.resolve(compilation.outputOptions.path, this.options.outputPath);
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    } catch (error) {
      compilation.warnings.push(
        new Error(`BundleSizePlugin: Failed to write report - ${error.message}`)
      );
    }
  }

  generateSummary() {
    const summary = {
      totalChunks: Object.keys(this.stats.chunks).length,
      totalAssets: Object.keys(this.stats.assets).length,
      totalEntrypoints: Object.keys(this.stats.entrypoints).length,
      warnings: this.stats.warnings.length,
      errors: this.stats.errors.length,
    };

    // Calculate total sizes by type
    const assetsByType = {};
    for (const asset of Object.values(this.stats.assets)) {
      if (!assetsByType[asset.type]) {
        assetsByType[asset.type] = { count: 0, size: 0 };
      }
      assetsByType[asset.type].count++;
      assetsByType[asset.type].size += asset.size;
    }

    summary.assetsByType = {};
    for (const [type, data] of Object.entries(assetsByType)) {
      summary.assetsByType[type] = {
        count: data.count,
        size: data.size,
        sizeKB: Math.round(data.size / 1024 * 100) / 100,
      };
    }

    // Find largest items
    summary.largest = {
      chunk: this.findLargest(this.stats.chunks, 'size'),
      asset: this.findLargest(this.stats.assets, 'size'),
      entrypoint: this.findLargest(this.stats.entrypoints, 'size'),
    };

    return summary;
  }

  findLargest(items, sizeProperty) {
    let largest = null;
    let largestSize = 0;

    for (const [name, item] of Object.entries(items)) {
      if (item[sizeProperty] > largestSize) {
        largest = { name, ...item };
        largestSize = item[sizeProperty];
      }
    }

    return largest;
  }

  logResults(stats) {
    const hasErrors = this.stats.errors.length > 0;
    const hasWarnings = this.stats.warnings.length > 0;

    if (hasErrors) {
      console.log('\n🚨 Bundle Size Errors:');
      for (const error of this.stats.errors) {
        console.log(`  ❌ ${error.message} (${Math.round(error.size / 1024)}KB)`);
      }
    }

    if (hasWarnings) {
      console.log('\n⚠️  Bundle Size Warnings:');
      for (const warning of this.stats.warnings) {
        console.log(`  ⚠️  ${warning.message} (${Math.round(warning.size / 1024)}KB)`);
      }
    }

    if (!hasErrors && !hasWarnings) {
      console.log('\n✅ All bundles are within size limits');
    }

    // Log summary
    const summary = this.stats.summary || this.generateSummary();
    console.log('\n📊 Bundle Summary:');
    console.log(`  Chunks: ${summary.totalChunks}`);
    console.log(`  Assets: ${summary.totalAssets}`);
    
    if (summary.assetsByType) {
      for (const [type, data] of Object.entries(summary.assetsByType)) {
        console.log(`  ${type}: ${data.count} files, ${data.sizeKB}KB`);
      }
    }

    console.log(`\n📄 Report saved to: ${this.options.outputPath}`);
  }
}

module.exports = BundleSizePlugin;