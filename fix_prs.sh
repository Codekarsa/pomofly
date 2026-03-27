#!/bin/bash

# Daily PR Fix Script
# Fixes package-lock.json conflicts across all open PR branches

cd pomofly

# Get list of all remote branches (excluding main)
branches=(
    "security/input-sanitization-xss-protection-311"
    "fix/pomodoro-timer-memory-leaks-312"
    "feat/comprehensive-nextjs-config-331"
    "feature/loading-states-skeleton-screens-issue-316"
    "feature/aria-live-regions-screen-reader-support-issue-313"
    "feature/performance-budget-ci-issue-297"
    "feature/enhanced-timezone-handling-issue-308"
    "feature/browser-notification-handling-issue-293"
    "feature/enhanced-nextjs-config-issue-292"
    "feature/e2e-testing-playwright-issue-284"
    "feature/typescript-strict-mode-issue-281"
    "feature/prettier-integration-issue-282"
    "feature/error-boundary-testing-issue-248"
    "feature/dependency-scanning-issue-270"
    "fix/request-body-size-limits-issue-255"
    "feature/keyboard-shortcuts-issue-262"
    "feat/api-documentation-242"
    "feature/health-check-endpoints-233"
    "feature/localstorage-cache-invalidation-232"
    "security/script-integrity-validation-231"
    "fix/claude-api-model-validation-234"
    "feature/dark-mode-theme-toggle-211"
    "feature/timer-completion-sound-notifications-214"
    "fix/claude-api-validation-224"
    "feature/timer-completion-sound-notifications"
    "feature/csp-headers-implementation"
)

fixed_count=0
failed_count=0
already_fixed=0

for branch in "${branches[@]}"; do
    echo "🔍 Checking branch: $branch"
    
    # Checkout branch
    if git checkout "$branch" 2>/dev/null; then
        # Check if package-lock.json exists
        if [ -f "package-lock.json" ]; then
            echo "  ❌ Found conflicting package-lock.json"
            
            # Remove package-lock.json
            rm package-lock.json
            
            # Commit and push fix
            if git add . && git commit -m "fix: remove conflicting package-lock.json file

- Project uses yarn as package manager (defined in package.json)
- package-lock.json was causing dependency resolution conflicts  
- CI workflow expects yarn.lock only for consistent builds" && git push; then
                echo "  ✅ Fixed and pushed"
                ((fixed_count++))
            else
                echo "  ⚠️ Failed to push fix"
                ((failed_count++))
            fi
        else
            echo "  ✅ Already clean (no package-lock.json)"
            ((already_fixed++))
        fi
    else
        echo "  ⚠️ Failed to checkout branch"
        ((failed_count++))
    fi
    
    echo ""
done

echo "📊 SUMMARY:"
echo "  Fixed and pushed: $fixed_count"
echo "  Already clean: $already_fixed" 
echo "  Failed: $failed_count"
echo "  Total processed: $((fixed_count + already_fixed + failed_count))"