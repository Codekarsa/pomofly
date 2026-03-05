import { NextRequest, NextResponse } from 'next/server';

/**
 * CSP violation reporting endpoint
 * Logs CSP violations for security monitoring
 */
export async function POST(request: NextRequest) {
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