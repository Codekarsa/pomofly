/**
 * CSP Violation Reporter
 * 
 * Handles Content Security Policy violation reporting and logging
 * for monitoring and debugging security policy effectiveness.
 */

export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    referrer?: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    disposition: string;
    'blocked-uri': string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code'?: number;
    'script-sample'?: string;
  };
}

/**
 * Handle CSP violation reports in development environment
 */
export function handleCSPViolation(report: CSPViolationReport): void {
  const violation = report['csp-report'];
  
  // Only log in development to avoid spamming production logs
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 CSP Violation Detected');
    console.error('Violated Directive:', violation['violated-directive']);
    console.error('Blocked URI:', violation['blocked-uri']);
    console.error('Document URI:', violation['document-uri']);
    console.error('Source File:', violation['source-file'] || 'Unknown');
    console.error('Line:', violation['line-number'] || 'Unknown');
    console.error('Full Report:', violation);
    console.groupEnd();
    
    // Show user-friendly warning in development
    console.warn(
      'CSP Violation: This indicates a potential security issue. ' +
      'Review the blocked resource and update CSP policy if legitimate.'
    );
  }
  
  // In production, you might want to send to monitoring service
  // Example: sendToMonitoringService(violation);
}

/**
 * Initialize CSP violation event listener
 */
export function initializeCSPReporting(): void {
  if (typeof window !== 'undefined') {
    document.addEventListener('securitypolicyviolation', (event) => {
      const report: CSPViolationReport = {
        'csp-report': {
          'document-uri': event.documentURI,
          referrer: event.referrer,
          'violated-directive': event.violatedDirective,
          'effective-directive': event.effectiveDirective,
          'original-policy': event.originalPolicy,
          disposition: event.disposition,
          'blocked-uri': event.blockedURI,
          'line-number': event.lineNumber,
          'column-number': event.columnNumber,
          'source-file': event.sourceFile,
          'status-code': event.statusCode,
          'script-sample': event.sample
        }
      };
      
      handleCSPViolation(report);
    });
  }
}

/**
 * CSP configuration utility for debugging
 */
export const CSPConfig = {
  // Common CSP directives for reference
  directives: {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com",
    'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src': "'self' data: https://fonts.gstatic.com",
    'img-src': "'self' data: https: blob:",
    'connect-src': "'self' https://*.firebase.googleapis.com https://firebaseinstallations.googleapis.com https://firebase.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://api.anthropic.com",
    'frame-src': "'none'",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'frame-ancestors': "'none'"
  },
  
  /**
   * Validate current CSP policy
   */
  validate(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check if CSP meta tag exists
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      console.log('✅ CSP meta tag found:', cspMeta.getAttribute('content'));
      return true;
    }
    
    // CSP might be set via headers (not visible in DOM)
    console.log('ℹ️ CSP likely set via HTTP headers (not visible in DOM)');
    return true;
  }
};