import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const FeedbackSchema = z.object({
  type: z.enum(['error', 'general', 'feature', 'bug']),
  rating: z.number().min(1).max(5).optional(),
  message: z.string().min(1).max(5000),
  context: z.object({
    component: z.string().optional(),
    action: z.string().optional(),
    userId: z.string().optional(),
    timestamp: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
  userAgent: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const feedback = FeedbackSchema.parse(body);
    
    // Add server-side metadata
    const enrichedFeedback = {
      ...feedback,
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ip: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || feedback.userAgent || 'unknown',
      url: request.headers.get('referer'),
    };

    // In a real application, you would:
    // 1. Save to database (e.g., Firestore)
    // 2. Send to monitoring service (e.g., Sentry)
    // 3. Send to analytics (e.g., Google Analytics)
    // 4. Send notifications for critical feedback

    // For now, just log it
    console.log('📝 Feedback received:', enrichedFeedback);

    // Simulate saving to storage
    // In production, replace this with actual database save
    try {
      // This would be your database save operation
      // await saveFeedbackToDatabase(enrichedFeedback);
      console.log('✅ Feedback saved successfully');
    } catch (saveError) {
      console.error('❌ Failed to save feedback:', saveError);
      
      // Still return success to user, but log the issue
      return NextResponse.json(
        { 
          success: true, 
          id: enrichedFeedback.id,
          message: 'Thank you for your feedback! We appreciate your input.',
          warning: 'Your feedback was received but there was an issue saving it. Our team has been notified.'
        },
        { status: 200 }
      );
    }

    // Send notifications for high-priority feedback
    if (feedback.type === 'bug' || feedback.type === 'error' || (feedback.type === 'general' && feedback.rating && feedback.rating <= 2)) {
      // In production, send to your notification service
      console.log('🚨 High-priority feedback received, notifying team...');
      // await sendSlackNotification(enrichedFeedback);
      // await sendEmailToSupport(enrichedFeedback);
    }

    return NextResponse.json(
      { 
        success: true, 
        id: enrichedFeedback.id,
        message: 'Thank you for your feedback! We appreciate your input and will review it carefully.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Feedback API error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid feedback data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process feedback. Please try again later.'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve feedback statistics (admin only)
export async function GET(request: NextRequest) {
  try {
    // In production, add authentication/authorization here
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || '7d';
    
    // Mock statistics - in production, query your database
    const stats = {
      total: 42,
      byType: {
        general: 18,
        bug: 12,
        feature: 8,
        error: 4
      },
      averageRating: 4.1,
      timeframe,
      period: `last ${timeframe}`,
      trends: {
        increasing: ['feature'],
        decreasing: ['bug'],
        stable: ['general', 'error']
      }
    };

    return NextResponse.json({ success: true, stats }, { status: 200 });

  } catch (error) {
    console.error('❌ Feedback stats API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve feedback statistics' },
      { status: 500 }
    );
  }
}