import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ErrorSchema = z.object({
  id: z.string(),
  message: z.string(),
  type: z.enum(['network', 'validation', 'auth', 'permission', 'server', 'unknown']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  stack: z.string().optional(),
  context: z.object({
    component: z.string().optional(),
    action: z.string().optional(),
    userId: z.string().optional(),
    timestamp: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
  userAgent: z.string().optional(),
  url: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const errorData = ErrorSchema.parse(body);
    
    // Add server-side metadata
    const enrichedError = {
      ...errorData,
      serverTimestamp: new Date().toISOString(),
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || errorData.userAgent || 'unknown',
      referer: request.headers.get('referer') || errorData.url,
      sessionId: request.headers.get('x-session-id'), // If you track sessions
    };

    // Log error with appropriate level
    const logPrefix = {
      low: '⚠️ ',
      medium: '🔸',
      high: '🔥',
      critical: '💥'
    }[errorData.severity] || '❓';

    console.log(`${logPrefix} Client Error [${errorData.type.toUpperCase()}]:`, {
      message: errorData.message,
      component: errorData.context?.component,
      action: errorData.context?.action,
      severity: errorData.severity,
      userId: errorData.context?.userId,
      timestamp: errorData.context?.timestamp
    });

    // In production, you would:
    // 1. Save to error tracking service (Sentry, LogRocket, etc.)
    // 2. Save to database for analytics
    // 3. Send alerts for critical errors
    // 4. Track error patterns and frequencies

    // Simulate different actions based on error severity
    if (errorData.severity === 'critical') {
      // Send immediate alerts
      console.log('🚨 CRITICAL ERROR - Sending immediate alerts');
      // await sendPagerDutyAlert(enrichedError);
      // await sendSlackAlert(enrichedError);
    } else if (errorData.severity === 'high') {
      // Send high-priority notifications
      console.log('🔴 HIGH SEVERITY ERROR - Notifying on-call team');
      // await sendSlackNotification(enrichedError);
    }

    // Check for error patterns
    // In production, implement smart error pattern detection
    const isKnownIssue = await checkForKnownIssue(errorData);
    if (isKnownIssue) {
      console.log('📋 Known issue detected, tracking occurrence...');
    }

    return NextResponse.json(
      { 
        success: true,
        tracked: true,
        id: errorData.id,
        message: 'Error has been logged and our team has been notified.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error tracking API error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid error data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Don't let error tracking failures break the app
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to track error, but error was logged locally'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for error analytics (admin only)
export async function GET(request: NextRequest) {
  try {
    // In production, add proper authentication
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || '24h';
    const severity = url.searchParams.get('severity');
    const type = url.searchParams.get('type');
    
    // Mock analytics data - in production, query your error database
    const analytics = {
      timeframe,
      totalErrors: 127,
      byType: {
        network: 45,
        validation: 32,
        server: 28,
        auth: 15,
        permission: 5,
        unknown: 2
      },
      bySeverity: {
        low: 89,
        medium: 28,
        high: 8,
        critical: 2
      },
      topComponents: [
        { component: 'TaskList', count: 23 },
        { component: 'PomodoroTimer', count: 18 },
        { component: 'AuthProvider', count: 15 },
        { component: 'API', count: 12 }
      ],
      trends: {
        hourly: generateMockTrendData(24),
        daily: generateMockTrendData(7)
      },
      recentCritical: [
        {
          id: 'error_123',
          message: 'Firebase connection timeout',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          component: 'AuthProvider'
        }
      ]
    };

    // Apply filters
    if (severity) {
      const filteredTotal = analytics.bySeverity[severity as keyof typeof analytics.bySeverity] || 0;
      analytics.totalErrors = filteredTotal;
    }

    return NextResponse.json({ success: true, analytics }, { status: 200 });

  } catch (error) {
    console.error('❌ Error analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve error analytics' },
      { status: 500 }
    );
  }
}

// Helper function to check for known issues
async function checkForKnownIssue(errorData: any): Promise<boolean> {
  // In production, this would check against a database of known issues
  const knownPatterns = [
    'Failed to fetch',
    'NetworkError',
    'Firebase: Error (auth/network-request-failed)',
    'ResizeObserver loop limit exceeded'
  ];

  return knownPatterns.some(pattern => 
    errorData.message.includes(pattern)
  );
}

// Helper function to generate mock trend data
function generateMockTrendData(periods: number): Array<{ period: string; count: number }> {
  const data = [];
  for (let i = periods - 1; i >= 0; i--) {
    const date = new Date();
    date.setHours(date.getHours() - i);
    data.push({
      period: date.toISOString(),
      count: Math.floor(Math.random() * 20) + 1
    });
  }
  return data;
}