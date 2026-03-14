# Script Security Policy

This document outlines the security measures implemented to protect against script injection attacks and ensure script integrity.

## Overview

The project implements a secure script execution system to prevent:
- Script injection attacks
- Execution of modified/compromised scripts
- Unauthorized script execution outside designated directories
- Malicious argument injection

## Security Features

### 1. Script Integrity Validation

All scripts are validated using SHA-256 hashes before execution:

- Scripts must be registered in `SCRIPT_REGISTRY` with their expected hash
- Any modification to registered scripts will cause execution to fail
- Unregistered scripts generate warnings but can still execute (for development)

### 2. Path Validation

- Scripts must be located within the `scripts/` directory
- Path traversal attempts are blocked
- Only files (not directories) can be executed

### 3. Argument Sanitization

- Script arguments are sanitized to remove dangerous characters
- Characters like `;`, `&`, `|`, backticks, `$()`, etc. are stripped
- Sanitization events are logged for security auditing

### 4. Secure Execution Environment

- Scripts run with a controlled environment
- Only essential environment variables are passed through
- Working directory is set to project root

## Usage

### Running Scripts via Package.json

All package.json scripts now use the secure runner:

```bash
yarn beads:push    # Secure execution of beads-github-sync.sh push
yarn beads:pull    # Secure execution of beads-github-sync.sh pull
yarn beads:sync    # Secure execution of beads-github-sync.sh status
```

### Direct Script Runner Usage

```bash
# Execute a script
node scripts/script-runner.js script-name.sh [args...]

# Calculate hash for a new script
node scripts/script-runner.js --hash script-name.sh
```

## Adding New Scripts

1. Create your script in the `scripts/` directory
2. Calculate its hash: `node scripts/script-runner.js --hash your-script.sh`
3. Add the script and hash to `SCRIPT_REGISTRY` in `scripts/script-runner.js`
4. Update package.json to use the secure runner if needed

Example:
```javascript
const SCRIPT_REGISTRY = {
  'beads-github-sync.sh': 'c35e93fb113631816e04b2452551b46d5d8c810264c23bc1c86ad51c85f1c0db',
  'your-script.sh': 'new-hash-here',
};
```

## Security Warnings

The system will warn about:
- Scripts without registered hashes
- Argument sanitization events
- Any security-related issues during execution

## Best Practices

1. **Always register script hashes** for production scripts
2. **Update hashes** when scripts are legitimately modified
3. **Review warnings** in security logs
4. **Limit script complexity** - prefer Node.js scripts over complex shell scripts
5. **Avoid user input** in script arguments when possible

## Incident Response

If integrity validation fails:

1. **Stop immediately** - Do not override the security check
2. **Investigate** the script modification
3. **Verify legitimacy** of any changes
4. **Update hash** only after confirming changes are safe
5. **Review logs** for any signs of compromise

## Migration from Direct Shell Execution

Old (insecure):
```json
{
  "scripts": {
    "beads": "./scripts/beads-github-sync.sh status"
  }
}
```

New (secure):
```json
{
  "scripts": {
    "beads": "node scripts/script-runner.js beads-github-sync.sh status"
  }
}
```

This ensures all script execution goes through security validation.