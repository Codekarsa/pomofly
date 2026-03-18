#!/usr/bin/env node

/**
 * Security Check Script
 * 
 * This script performs various security checks on the project:
 * - NPM audit for vulnerabilities
 * - Dependency analysis
 * - Basic security configuration validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Running Pomofly Security Checks...\n');

// Check 1: NPM Audit
console.log('1️⃣ Checking for dependency vulnerabilities...');
try {
  const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
  const audit = JSON.parse(auditResult);
  
  if (audit.metadata.vulnerabilities.total === 0) {
    console.log('✅ No vulnerabilities found in dependencies\n');
  } else {
    console.log(`⚠️  Found ${audit.metadata.vulnerabilities.total} vulnerabilities:`);
    console.log(`   - High: ${audit.metadata.vulnerabilities.high}`);
    console.log(`   - Moderate: ${audit.metadata.vulnerabilities.moderate}`);
    console.log(`   - Low: ${audit.metadata.vulnerabilities.low}`);
    console.log('   Run `npm audit fix` to attempt automatic fixes\n');
  }
} catch (error) {
  console.log('❌ Error running npm audit');
  console.log('   This might indicate vulnerabilities found');
  console.log('   Check manually with: npm audit\n');
}

// Check 2: Environment Configuration
console.log('2️⃣ Checking environment configuration...');
const envExample = path.join(process.cwd(), '.env.example');
const envLocal = path.join(process.cwd(), '.env.local');

if (fs.existsSync(envExample)) {
  console.log('✅ .env.example file exists');
} else {
  console.log('⚠️  .env.example file missing');
}

if (fs.existsSync(envLocal)) {
  console.log('✅ .env.local file exists (don\'t commit this!)');
} else {
  console.log('ℹ️  .env.local file not found (create for local development)');
}
console.log();

// Check 3: Security Files
console.log('3️⃣ Checking security configuration files...');
const securityFiles = [
  { file: 'SECURITY.md', description: 'Security policy' },
  { file: '.github/dependabot.yml', description: 'Dependabot configuration' },
];

securityFiles.forEach(({ file, description }) => {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    console.log(`✅ ${file} (${description})`);
  } else {
    console.log(`❌ ${file} missing (${description})`);
  }
});
console.log();

// Check 4: Package.json Security Scripts
console.log('4️⃣ Checking security scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const securityScripts = ['audit', 'security:check'];

securityScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`✅ ${script} script available`);
  } else {
    console.log(`❌ ${script} script missing`);
  }
});
console.log();

console.log('🔒 Security check complete!');
console.log('\n📋 Recommendations:');
console.log('- Run security checks weekly: yarn security:check');
console.log('- Review Dependabot PRs promptly');
console.log('- Keep dependencies updated');
console.log('- Monitor GitHub Security tab for alerts');