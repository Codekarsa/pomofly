import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (reset on server restart)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_REPORTS_PER_IP = 20; // Max reports per IP per window
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes

interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    'referrer'?: string;
    'blocked-uri'?: string;
    'violated-directive': string;
    'original-policy': string;
    'disposition'?: string;
    'script-sample'?: string;
    'status-code'?: number;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
  };
}

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientLimit = rateLimit.get(clientId);
  
  if (!clientLimit || now > clientLimit.resetTime) {
    // Reset or initialize
    rateLimit.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientLimit.count >= MAX_REPORTS_PER_IP) {
    return false;
  }
  
  clientLimit.count++;
  return true;
}

function categorizeSeverity(violatedDirective: string, blockedUri: string): 'critical' | 'high' | 'medium' | 'low' {
  const directive = violatedDirective.toLowerCase();
  const uri = blockedUri?.toLowerCase() || '';
  
  // Critical: Script injections or potentially malicious content
  if (directive.includes('script-src') && (uri.includes('javascript:') || uri.includes('data:') || uri.includes('blob:'))) {
    return 'critical';
  }
  
  // High: External script sources or unsafe eval
  if (directive.includes('script-src') || directive.includes('object-src')) {
    return 'high';
  }
  
  // Medium: Style violations or frame violations
  if (directive.includes('style-src') || directive.includes('frame-src') || directive.includes('connect-src')) {
    return 'medium';
  }
  
  // Low: Images, fonts, media
  return 'low';
}

async function sendToExternalService(violationData: any): Promise<void> {
  const errorEndpoint = process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT;
  
  if (!errorEndpoint) {
    return;
  }
  
  try {
    // Send to external service (Sentry, DataDog, etc.)
    await fetch(errorEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'csp_violation',
        data: violationData,
      }),
    });
  } catch (error) {
    console.error('Failed to send CSP violation to external service:', error);
  }
}

/**
 * Enhanced CSP violation reporting endpoint
 * Provides comprehensive security monitoring with rate limiting and external service integration
 */
export async function POST(request: NextRequest) {
  try {
    // Get client identifier for rate limiting
    const clientId = request.ip || 
                    request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    // Apply rate limiting
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' }, 
        { status: 429, headers: { 'Retry-After': '300' } }
      );
    }
    
    // Parse and validate CSP report
    const body = await request.json();
    if (!body || !body['csp-report']) {
      return NextResponse.json({ error: 'Invalid CSP report format' }, { status: 400 });
    }
    
    const cspReport: CSPViolationReport = body;
    const report = cspReport['csp-report'];
    
    // Validate required fields
    if (!report['document-uri'] || !report['violated-directive']) {
      return NextResponse.json({ error: 'Missing required CSP report fields' }, { status: 400 });
    }
    
    // Extract security-relevant context
    const violationContext = {
      id: `csp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'csp_violation',
      severity: categorizeSeverity(report['violated-directive'], report['blocked-uri'] || ''),
      
      // Request context
      clientInfo: {
        ip: clientId,
        userAgent: request.headers.get('user-agent') || 'unknown',
        referer: request.headers.get('referer'),
        accept: request.headers.get('accept'),
        acceptLanguage: request.headers.get('accept-language'),
      },
      
      // CSP violation details
      violation: {
        documentUri: report['document-uri'],
        blockedUri: report['blocked-uri'] || 'unknown',
        violatedDirective: report['violated-directive'],
        originalPolicy: report['original-policy'],
        disposition: report['disposition'] || 'enforce',
        scriptSample: report['script-sample'],
        sourceFile: report['source-file'],
        lineNumber: report['line-number'],
        columnNumber: report['column-number'],
        statusCode: report['status-code'],
      },
      
      // Security analysis
      analysis: {
        isBlocked: report['disposition'] !== 'report',
        isPotentialXSS: report['violated-directive'].includes('script-src'),
        isExternalResource: report['blocked-uri']?.includes('://') && 
                           !report['blocked-uri']?.includes(new URL(report['document-uri']).hostname),
        sourceType: report['blocked-uri']?.startsWith('data:') ? 'data-uri' :
                   report['blocked-uri']?.startsWith('blob:') ? 'blob' :
                   report['blocked-uri']?.startsWith('javascript:') ? 'javascript' : 'external',
      },
    };
    
    // Log violation with appropriate level
    const logMessage = `CSP Violation [${violationContext.severity.toUpperCase()}]: ${report['violated-directive']} - ${report['blocked-uri'] || 'unknown'}`;
    
    switch (violationContext.severity) {
      case 'critical':
        console.error('🚨 CRITICAL CSP VIOLATION:', logMessage, violationContext);
        break;
      case 'high':
        console.error('❌ HIGH CSP VIOLATION:', logMessage, violationContext);
        break;
      case 'medium':
        console.warn('⚠️  MEDIUM CSP VIOLATION:', logMessage, violationContext);
        break;
      default:
        console.log('ℹ️  LOW CSP VIOLATION:', logMessage, violationContext);
    }
    
    // Send to external monitoring service if configured
    if (process.env.NEXT_PUBLIC_MONITORING_ENABLED === 'true') {
      await sendToExternalService(violationContext);
    }
    
    return NextResponse.json({ 
      status: 'violation processed',
      id: violationContext.id,
      severity: violationContext.severity 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error processing CSP report:', error);
    
    // Log error for debugging
    const errorContext = {
      timestamp: new Date().toISOString(),
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      requestInfo: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        contentType: request.headers.get('content-type'),
      }
    };
    
    console.error('CSP Report Processing Error:', errorContext);
    
    return NextResponse.json({ 
      error: 'Internal server error processing CSP report' 
    }, { status: 500 });
  }
}

/**
 * Handle GET requests to show CSP reporting status
 */
export async function GET() {
  return NextResponse.json({
    service: 'CSP Violation Reporting',
    status: 'operational',
    endpoints: {
      report: 'POST /api/csp-report',
      status: 'GET /api/csp-report'
    },
    features: {
      rateLimiting: true,
      severityAnalysis: true,
      externalIntegration: !!process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT,
      monitoringEnabled: process.env.NEXT_PUBLIC_MONITORING_ENABLED === 'true'
    },
    limits: {
      maxReportsPerIP: MAX_REPORTS_PER_IP,
      rateLimitWindow: `${RATE_LIMIT_WINDOW / 60000} minutes`
    }
  });
}