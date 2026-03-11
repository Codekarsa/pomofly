#!/usr/bin/env node

const requiredEnvVars = [
  {
    name: 'NEXT_PUBLIC_FIREBASE_API_KEY',
    description: 'Firebase API Key',
    validate: (value) => value && value.length > 0,
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    description: 'Firebase Auth Domain',
    validate: (value) => value && value.includes('.firebaseapp.com'),
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    description: 'Firebase Project ID',
    validate: (value) => value && value.length > 0,
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    description: 'Firebase Storage Bucket',
    validate: (value) => value && value.includes('.appspot.com'),
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    description: 'Firebase Messaging Sender ID',
    validate: (value) => value && /^\d+$/.test(value),
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_APP_ID',
    description: 'Firebase App ID',
    validate: (value) => value && value.startsWith('1:'),
  },
  {
    name: 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
    description: 'Firebase Measurement ID (Google Analytics)',
    validate: (value) => value && value.startsWith('G-'),
  },
  {
    name: 'CLAUDE_API_KEY',
    description: 'Claude API Key',
    validate: (value) => value && value.startsWith('sk-'),
  },
  {
    name: 'CLAUDE_MODEL',
    description: 'Claude Model Name',
    validate: (value) => value && value.length > 0,
  },
];

const optionalEnvVars = [
  'NODE_ENV',
  'VERCEL_URL',
  'NEXT_PUBLIC_VERCEL_URL',
];

function validateEnvironment() {
  // Skip validation in CI environments where secrets are injected differently
  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
    console.log('🚀 CI environment detected - skipping environment validation');
    return;
  }

  console.log('🔍 Validating environment variables...');
  
  const errors = [];
  const warnings = [];

  // Check required variables
  requiredEnvVars.forEach(({ name, description, validate }) => {
    const value = process.env[name];
    
    if (!value) {
      errors.push(`❌ Missing required environment variable: ${name} (${description})`);
    } else if (!validate(value)) {
      errors.push(`❌ Invalid format for environment variable: ${name} (${description})`);
    } else {
      console.log(`✅ ${name}: Valid`);
    }
  });

  // Check for unused variables (variables in .env that aren't in our list)
  const knownVars = [...requiredEnvVars.map(v => v.name), ...optionalEnvVars];
  const envVars = Object.keys(process.env).filter(key => 
    key.startsWith('NEXT_PUBLIC_') || 
    key.startsWith('CLAUDE_') || 
    key === 'NODE_ENV'
  );

  envVars.forEach(varName => {
    if (!knownVars.includes(varName) && !varName.startsWith('VERCEL_')) {
      warnings.push(`⚠️  Unknown environment variable: ${varName}`);
    }
  });

  // Display results
  if (warnings.length > 0) {
    console.log('\n📝 Warnings:');
    warnings.forEach(warning => console.log(warning));
  }

  if (errors.length > 0) {
    console.error('\n❌ Environment validation failed:');
    errors.forEach(error => console.error(error));
    
    console.error('\n📋 To fix this:');
    console.error('1. Copy .env.local.example to .env.local');
    console.error('2. Fill in all required environment variables');
    console.error('3. Ensure all values follow the expected format');
    console.error('\nSee README.md for detailed setup instructions.');
    
    process.exit(1);
  }

  console.log('\n✅ Environment validation passed!');
}

// Only run validation if this script is executed directly
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };