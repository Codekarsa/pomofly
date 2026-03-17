#!/bin/bash

# Security scanning script for Pomofly
# This script provides comprehensive security scanning including:
# - Dependency vulnerability scanning
# - Secret detection
# - License compliance
# - Security best practices validation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SCAN_ALL=false
SCAN_DEPS=false
SCAN_SECRETS=false
SCAN_LICENSES=false
OUTPUT_DIR="security-reports"
VERBOSE=false

# Display usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Comprehensive security scanning for Pomofly application.

OPTIONS:
    -a, --all           Run all security scans
    -d, --deps          Run dependency vulnerability scanning
    -s, --secrets       Run secret detection
    -l, --licenses      Run license compliance check
    -o, --output DIR    Output directory for reports (default: security-reports)
    -v, --verbose       Enable verbose output
    -h, --help          Display this help message

EXAMPLES:
    $0 --all                    # Run all scans
    $0 --deps --secrets         # Run only dependency and secret scans
    $0 -a -o ./reports         # Run all scans with custom output directory

EXIT CODES:
    0   All scans passed
    1   Critical vulnerabilities found
    2   High-severity vulnerabilities found
    3   Script execution error
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -a|--all)
                SCAN_ALL=true
                shift
                ;;
            -d|--deps)
                SCAN_DEPS=true
                shift
                ;;
            -s|--secrets)
                SCAN_SECRETS=true
                shift
                ;;
            -l|--licenses)
                SCAN_LICENSES=true
                shift
                ;;
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                usage
                exit 3
                ;;
        esac
    done

    # If --all is specified, enable all scans
    if [[ "$SCAN_ALL" == true ]]; then
        SCAN_DEPS=true
        SCAN_SECRETS=true
        SCAN_LICENSES=true
    fi

    # If no specific scans selected, show usage
    if [[ "$SCAN_DEPS" == false && "$SCAN_SECRETS" == false && "$SCAN_LICENSES" == false ]]; then
        echo -e "${RED}Error: No scan type specified${NC}"
        usage
        exit 3
    fi
}

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

# Setup output directory
setup_output_dir() {
    log_info "Setting up output directory: $OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR"
    
    # Create timestamped subdirectory
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    SCAN_DIR="$OUTPUT_DIR/scan_$TIMESTAMP"
    mkdir -p "$SCAN_DIR"
    
    log_verbose "Created scan directory: $SCAN_DIR"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if we're in a Node.js project
    if [[ ! -f package.json ]]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 3
    fi
    
    # Check if node_modules exists
    if [[ ! -d node_modules ]]; then
        log_warning "node_modules not found. Running npm install..."
        npm install
    fi
    
    log_success "Prerequisites check passed"
}

# Install scanning tools if needed
install_tools() {
    log_info "Checking and installing required tools..."
    
    # Install npm-audit-ci if not available
    if ! command -v audit-ci &> /dev/null; then
        log_info "Installing audit-ci for enhanced vulnerability scanning..."
        npm install -g audit-ci@latest
    fi
    
    # Install license-checker if needed for license scanning
    if [[ "$SCAN_LICENSES" == true ]] && ! command -v license-checker &> /dev/null; then
        log_info "Installing license-checker..."
        npm install -g license-checker@latest
    fi
    
    log_success "Required tools ready"
}

# Dependency vulnerability scanning
scan_dependencies() {
    log_info "Starting dependency vulnerability scanning..."
    
    local report_file="$SCAN_DIR/dependency-scan.json"
    local summary_file="$SCAN_DIR/dependency-summary.txt"
    local exit_code=0
    
    # NPM Audit with JSON output
    log_verbose "Running npm audit..."
    if npm audit --audit-level=moderate --json > "$report_file" 2>/dev/null; then
        log_success "npm audit completed - no vulnerabilities found"
        echo "✅ NPM Audit: PASSED - No moderate+ vulnerabilities detected" > "$summary_file"
    else
        audit_exit=$?
        log_warning "npm audit found vulnerabilities (exit code: $audit_exit)"
        
        # Parse audit results
        local total_vulns=$(cat "$report_file" | jq -r '.metadata.vulnerabilities.total // 0')
        local critical=$(cat "$report_file" | jq -r '.metadata.vulnerabilities.critical // 0')
        local high=$(cat "$report_file" | jq -r '.metadata.vulnerabilities.high // 0')
        local moderate=$(cat "$report_file" | jq -r '.metadata.vulnerabilities.moderate // 0')
        
        echo "❌ NPM Audit: FAILED" > "$summary_file"
        echo "  Total vulnerabilities: $total_vulns" >> "$summary_file"
        echo "  Critical: $critical" >> "$summary_file"
        echo "  High: $high" >> "$summary_file"
        echo "  Moderate: $moderate" >> "$summary_file"
        
        if [[ $critical -gt 0 ]]; then
            exit_code=1
        elif [[ $high -gt 0 ]]; then
            exit_code=2
        fi
    fi
    
    # Generate human-readable report
    log_verbose "Generating dependency scan summary..."
    if command -v jq &> /dev/null && [[ -s "$report_file" ]]; then
        cat "$report_file" | jq -r '
        if .vulnerabilities then
            "Detailed Vulnerability Report:",
            "================================",
            (.vulnerabilities | to_entries[] | 
                "\(.key):",
                "  Severity: \(.value.severity)",
                "  Title: \(.value.title)",
                "  Range: \(.value.range)",
                "  Recommendation: \(.value.recommendation // "No recommendation")",
                ""
            )
        else
            "No detailed vulnerability information available"
        end
        ' >> "$summary_file"
    fi
    
    log_info "Dependency scan complete. Report saved to $summary_file"
    return $exit_code
}

# Secret detection
scan_secrets() {
    log_info "Starting secret detection scan..."
    
    local report_file="$SCAN_DIR/secret-scan.txt"
    local exit_code=0
    
    # Common secret patterns
    declare -A secret_patterns=(
        ["firebase_key"]="AIza[0-9A-Za-z\\-_]{35}"
        ["anthropic_key"]="sk-ant-api03-[A-Za-z0-9\\-_]{95}"
        ["openai_key"]="sk-[A-Za-z0-9]{48}"
        ["generic_api_key"]="['\\\"][A-Za-z0-9]{20,}['\\\"]"
        ["aws_access_key"]="AKIA[0-9A-Z]{16}"
        ["github_token"]="gh[pousr]_[A-Za-z0-9]{36}"
        ["private_key"]="-----BEGIN [A-Z ]+PRIVATE KEY-----"
    )
    
    echo "🔍 Secret Detection Report" > "$report_file"
    echo "=========================" >> "$report_file"
    echo "Scan timestamp: $(date)" >> "$report_file"
    echo "" >> "$report_file"
    
    local secrets_found=false
    
    # Scan source files for each pattern
    for pattern_name in "${!secret_patterns[@]}"; do
        local pattern="${secret_patterns[$pattern_name]}"
        log_verbose "Scanning for $pattern_name..."
        
        # Search in source files, excluding node_modules and .git
        local matches=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) \
                       -not -path "./node_modules/*" \
                       -not -path "./.git/*" \
                       -not -path "./.next/*" \
                       -not -path "./out/*" \
                       -exec grep -l -E "$pattern" {} \; 2>/dev/null || true)
        
        if [[ -n "$matches" ]]; then
            echo "⚠️  Potential $pattern_name found in:" >> "$report_file"
            echo "$matches" | sed 's/^/    /' >> "$report_file"
            echo "" >> "$report_file"
            secrets_found=true
            exit_code=1
        fi
    done
    
    # Check for hardcoded credentials in config files
    log_verbose "Checking for hardcoded credentials in config files..."
    local config_issues=$(find . -name "*.json" -o -name "*.yaml" -o -name "*.yml" \
                         -not -path "./node_modules/*" \
                         -not -path "./.git/*" \
                         -exec grep -l -i "password\|secret\|key.*:" {} \; 2>/dev/null | \
                         grep -v package.json || true)
    
    if [[ -n "$config_issues" ]]; then
        echo "⚠️  Configuration files with potential credentials:" >> "$report_file"
        echo "$config_issues" | sed 's/^/    /' >> "$report_file"
        echo "" >> "$report_file"
        log_warning "Found potential credentials in config files"
    fi
    
    if [[ "$secrets_found" == false ]]; then
        echo "✅ No obvious secrets detected in source code" >> "$report_file"
        log_success "Secret scan completed - no issues found"
    else
        echo "❌ Potential secrets detected - manual review required" >> "$report_file"
        log_error "Secret scan found potential secrets"
    fi
    
    echo "" >> "$report_file"
    echo "Note: This scan checks for common patterns. Manual review is still recommended." >> "$report_file"
    
    log_info "Secret scan complete. Report saved to $report_file"
    return $exit_code
}

# License compliance check
scan_licenses() {
    log_info "Starting license compliance scan..."
    
    local report_file="$SCAN_DIR/license-scan.txt"
    local json_file="$SCAN_DIR/licenses.json"
    local exit_code=0
    
    # Generate license report
    log_verbose "Generating license inventory..."
    license-checker --production --json > "$json_file" 2>/dev/null || {
        log_error "Failed to generate license report"
        return 3
    }
    
    echo "📄 License Compliance Report" > "$report_file"
    echo "============================" >> "$report_file"
    echo "Scan timestamp: $(date)" >> "$report_file"
    echo "" >> "$report_file"
    
    # Check for potentially problematic licenses
    local problematic_licenses=("GPL-2.0" "GPL-3.0" "AGPL-1.0" "AGPL-3.0" "LGPL-2.0" "LGPL-2.1" "LGPL-3.0")
    local license_issues=false
    
    echo "🔍 License Analysis:" >> "$report_file"
    for license in "${problematic_licenses[@]}"; do
        local count=$(cat "$json_file" | jq -r "to_entries[] | select(.value.licenses == \"$license\") | .key" | wc -l)
        if [[ $count -gt 0 ]]; then
            echo "⚠️  Found $count packages with $license license" >> "$report_file"
            cat "$json_file" | jq -r "to_entries[] | select(.value.licenses == \"$license\") | \"    \(.key)\"" >> "$report_file"
            license_issues=true
            exit_code=2
        fi
    done
    
    if [[ "$license_issues" == false ]]; then
        echo "✅ No problematic licenses detected" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    echo "📊 License Summary:" >> "$report_file"
    license-checker --production --summary >> "$report_file" 2>/dev/null
    
    echo "" >> "$report_file"
    echo "💡 Recommendations:" >> "$report_file"
    echo "  - Review any GPL/AGPL licensed dependencies" >> "$report_file"
    echo "  - Consider alternatives for problematic licenses" >> "$report_file"
    echo "  - Consult legal team for commercial usage guidance" >> "$report_file"
    
    log_info "License compliance scan complete. Report saved to $report_file"
    return $exit_code
}

# Generate final summary report
generate_summary() {
    log_info "Generating final security summary..."
    
    local summary_file="$SCAN_DIR/security-summary.md"
    
    cat > "$summary_file" << EOF
# Security Scan Summary

**Scan Date:** $(date)  
**Project:** Pomofly  
**Scanner:** security-scan.sh v1.0  

## Scan Results

| Check | Status | Details |
|-------|--------|---------|
EOF

    # Dependency scan results
    if [[ "$SCAN_DEPS" == true ]]; then
        if [[ -f "$SCAN_DIR/dependency-summary.txt" ]]; then
            local deps_status=$(head -n1 "$SCAN_DIR/dependency-summary.txt" | cut -d: -f2 | tr -d ' ')
            if [[ "$deps_status" == "PASSED" ]]; then
                echo "| Dependency Vulnerabilities | ✅ Passed | No moderate+ vulnerabilities |" >> "$summary_file"
            else
                echo "| Dependency Vulnerabilities | ❌ Failed | Check dependency-summary.txt |" >> "$summary_file"
            fi
        fi
    fi
    
    # Secret scan results  
    if [[ "$SCAN_SECRETS" == true ]]; then
        if [[ -f "$SCAN_DIR/secret-scan.txt" ]]; then
            if grep -q "✅ No obvious secrets" "$SCAN_DIR/secret-scan.txt"; then
                echo "| Secret Detection | ✅ Passed | No secrets detected |" >> "$summary_file"
            else
                echo "| Secret Detection | ⚠️ Warning | Potential secrets found |" >> "$summary_file"
            fi
        fi
    fi
    
    # License scan results
    if [[ "$SCAN_LICENSES" == true ]]; then
        if [[ -f "$SCAN_DIR/license-scan.txt" ]]; then
            if grep -q "✅ No problematic licenses" "$SCAN_DIR/license-scan.txt"; then
                echo "| License Compliance | ✅ Passed | No problematic licenses |" >> "$summary_file"
            else
                echo "| License Compliance | ⚠️ Warning | Review license-scan.txt |" >> "$summary_file"
            fi
        fi
    fi
    
    cat >> "$summary_file" << EOF

## Recommendations

1. **Address Critical/High Vulnerabilities**: Update dependencies with known security issues
2. **Remove Secrets**: Never commit API keys, tokens, or credentials to source code
3. **Review Licenses**: Ensure all dependencies are compatible with your usage requirements
4. **Automate Scanning**: Integrate these scans into your CI/CD pipeline
5. **Regular Updates**: Run security scans regularly, especially before releases

## Report Files

EOF
    
    # List all generated files
    find "$SCAN_DIR" -name "*.txt" -o -name "*.json" -o -name "*.md" | sort | while read file; do
        local filename=$(basename "$file")
        echo "- [\`$filename\`](./$filename)" >> "$summary_file"
    done
    
    log_success "Security summary generated: $summary_file"
}

# Main execution
main() {
    local overall_exit_code=0
    
    echo "🛡️  Pomofly Security Scanner"
    echo "=============================="
    echo ""
    
    parse_args "$@"
    setup_output_dir
    check_prerequisites
    install_tools
    
    # Run selected scans
    if [[ "$SCAN_DEPS" == true ]]; then
        if ! scan_dependencies; then
            overall_exit_code=$?
        fi
        echo ""
    fi
    
    if [[ "$SCAN_SECRETS" == true ]]; then
        if ! scan_secrets; then
            overall_exit_code=$?
        fi
        echo ""
    fi
    
    if [[ "$SCAN_LICENSES" == true ]]; then
        if ! scan_licenses; then
            local license_exit=$?
            # Don't override critical/high severity exits with license warnings
            if [[ $overall_exit_code -eq 0 ]]; then
                overall_exit_code=$license_exit
            fi
        fi
        echo ""
    fi
    
    generate_summary
    
    # Final status report
    echo "🎯 Security Scan Complete"
    echo "========================"
    echo "📁 Reports location: $SCAN_DIR"
    echo "📋 Summary: $SCAN_DIR/security-summary.md"
    echo ""
    
    case $overall_exit_code in
        0)
            log_success "All security scans passed!"
            ;;
        1)
            log_error "Critical vulnerabilities found - immediate action required"
            ;;
        2)
            log_warning "High-severity issues or warnings found - review recommended"
            ;;
        *)
            log_error "Script execution error"
            ;;
    esac
    
    exit $overall_exit_code
}

# Execute main function with all arguments
main "$@"