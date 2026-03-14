#!/usr/bin/env node

/**
 * Secure Script Runner with Integrity Validation
 * 
 * This script provides secure execution of shell scripts with:
 * - Path validation
 * - Script integrity checks (SHA-256 hashes)
 * - Safe argument handling
 * - Execution logging
 */

const { execSync } = require('child_process');
const { createHash } = require('crypto');
const { readFileSync, existsSync, statSync } = require('fs');
const { resolve, dirname, basename, extname } = require('path');

// Allowed scripts directory (relative to project root)
const SCRIPTS_DIR = resolve(__dirname);

// Registered scripts with their expected SHA-256 hashes
const SCRIPT_REGISTRY = {
  'beads-github-sync.sh': 'c35e93fb113631816e04b2452551b46d5d8c810264c23bc1c86ad51c85f1c0db',
  // Add more scripts here as needed
};

/**
 * Calculate SHA-256 hash of a file
 */
function calculateFileHash(filePath) {
  try {
    const fileContent = readFileSync(filePath);
    return createHash('sha256').update(fileContent).digest('hex');
  } catch (error) {
    throw new Error(`Failed to calculate hash for ${filePath}: ${error.message}`);
  }
}

/**
 * Validate script path and ensure it's within allowed directory
 */
function validateScriptPath(scriptName) {
  const scriptPath = resolve(SCRIPTS_DIR, scriptName);
  
  // Ensure script is within the scripts directory
  if (!scriptPath.startsWith(SCRIPTS_DIR)) {
    throw new Error(`Script path outside allowed directory: ${scriptName}`);
  }
  
  // Check if file exists
  if (!existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptName}`);
  }
  
  // Ensure it's a file, not a directory
  if (!statSync(scriptPath).isFile()) {
    throw new Error(`Path is not a file: ${scriptName}`);
  }
  
  return scriptPath;
}

/**
 * Validate script integrity against known hash
 */
function validateScriptIntegrity(scriptName, scriptPath) {
  const expectedHash = SCRIPT_REGISTRY[scriptName];
  
  if (!expectedHash) {
    console.warn(`Warning: No integrity hash registered for script '${scriptName}'`);
    console.warn(`Current hash: ${calculateFileHash(scriptPath)}`);
    console.warn('Please register this script with its hash for security.');
    return false;
  }
  
  const actualHash = calculateFileHash(scriptPath);
  
  if (actualHash !== expectedHash) {
    throw new Error(
      `Script integrity check failed for '${scriptName}'.\n` +
      `Expected: ${expectedHash}\n` +
      `Actual:   ${actualHash}\n` +
      'The script may have been modified or corrupted.'
    );
  }
  
  return true;
}

/**
 * Sanitize and validate script arguments
 */
function sanitizeArguments(args) {
  return args.map(arg => {
    // Remove any potentially dangerous characters
    const sanitized = String(arg).replace(/[;&|`$(){}[\]<>]/g, '');
    
    // Log if sanitization occurred
    if (sanitized !== arg) {
      console.warn(`Warning: Sanitized argument '${arg}' to '${sanitized}'`);
    }
    
    return sanitized;
  });
}

/**
 * Execute script with security validation
 */
function executeScript(scriptName, args = []) {
  try {
    console.log(`Executing script: ${scriptName} with args: [${args.join(', ')}]`);
    
    // Validate script path
    const scriptPath = validateScriptPath(scriptName);
    
    // Validate script integrity
    const integrityValid = validateScriptIntegrity(scriptName, scriptPath);
    if (!integrityValid) {
      console.warn('Proceeding without integrity validation...');
    }
    
    // Sanitize arguments
    const sanitizedArgs = sanitizeArguments(args);
    
    // Execute script
    const command = `"${scriptPath}" ${sanitizedArgs.join(' ')}`;
    console.log(`Running: ${command}`);
    
    const result = execSync(command, {
      stdio: 'inherit',
      cwd: resolve(__dirname, '..'),
      env: {
        ...process.env,
        // Ensure secure environment
        PATH: process.env.PATH,
        HOME: process.env.HOME,
      }
    });
    
    console.log(`Script '${scriptName}' completed successfully.`);
    return result;
    
  } catch (error) {
    console.error(`Error executing script '${scriptName}': ${error.message}`);
    process.exit(1);
  }
}

/**
 * Update script hash in registry (for development/maintenance)
 */
function updateScriptHash(scriptName) {
  try {
    const scriptPath = validateScriptPath(scriptName);
    const hash = calculateFileHash(scriptPath);
    
    console.log(`Hash for '${scriptName}': ${hash}`);
    console.log('Add this to SCRIPT_REGISTRY in script-runner.js');
    
  } catch (error) {
    console.error(`Error calculating hash: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node script-runner.js <script-name> [args...]');
    console.error('       node script-runner.js --hash <script-name>');
    process.exit(1);
  }
  
  // Handle hash calculation
  if (args[0] === '--hash' && args[1]) {
    updateScriptHash(args[1]);
    return;
  }
  
  const [scriptName, ...scriptArgs] = args;
  executeScript(scriptName, scriptArgs);
}

module.exports = { executeScript, calculateFileHash, validateScriptPath };