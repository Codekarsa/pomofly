import { NextResponse } from 'next/server';
import { getClaudeConfig } from '@/lib/claude-config';

export async function GET() {
  try {
    const claudeConfig = getClaudeConfig();
    
    const response = {
      status: claudeConfig.isConfigured ? 'healthy' : 'unhealthy',
      model: claudeConfig.model,
      modelInfo: claudeConfig.modelInfo,
      timestamp: new Date().toISOString(),
      ...(claudeConfig.isConfigured ? {
        maxTokens: claudeConfig.maxTokens,
        configured: true
      } : {
        configured: false,
        error: 'Claude API not properly configured'
      })
    };
    
    return NextResponse.json(response, {
      status: claudeConfig.isConfigured ? 200 : 503
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        error: 'Failed to check Claude API health',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}