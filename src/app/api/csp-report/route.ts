import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    
    // Log CSP violations (in production, you might want to send to a monitoring service)
    console.error('CSP Violation Report:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      report: report
    });
    
    // You can extend this to send to monitoring services like Sentry
    // await sendToMonitoringService(report);
    
    return NextResponse.json({ status: 'reported' }, { status: 200 });
  } catch (error) {
    console.error('Failed to process CSP report:', error);
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}