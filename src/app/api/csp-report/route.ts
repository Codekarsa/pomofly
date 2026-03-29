import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, validateRequestSize } from '@/lib/auth-middleware';

/**
 * CSP violation reporting endpoint
 * Logs CSP violations for security monitoring
 */
export async function POST(request: NextRequest) {
  // Rate limiting - 10 requests per minute per IP (CSP violations should be infrequent)
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = checkRateLimit(`csp-report:${clientIP}`, 10, 60000);
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded', 
        details: 'Too many CSP reports. Please try again later.',
        resetTime: rateLimitResult.resetTime
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      }
    );
  }

  // Validate request size (limit to 10KB for CSP reports)
  const isValidSize = await validateRequestSize(request, 10 * 1024);
  if (!isValidSize) {
    return NextResponse.json(
      { error: 'Request too large', details: 'CSP report exceeds maximum size limit' },
      { status: 413 }
    );
  }

  try {
    const report = await request.json();
    
    // Log CSP violation for monitoring
    console.warn('CSP Violation Report:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      report: report,
    });

    // In production, you might want to send this to a logging service
    // Example: await sendToLoggingService(report);

    return NextResponse.json({ status: 'report received' }, { status: 200 });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return NextResponse.json({ error: 'Invalid report format' }, { status: 400 });
  }
}