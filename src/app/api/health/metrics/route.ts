import { NextRequest, NextResponse } from 'next/server';

/**
 * Health metrics endpoint for monitoring and observability
 * Provides detailed application metrics for external monitoring systems
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json'; // json or prometheus
  
  try {
    const metrics = await collectMetrics();
    
    if (format === 'prometheus') {
      const prometheusMetrics = formatPrometheusMetrics(metrics);
      return new Response(prometheusMetrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
    
    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    console.error('Metrics collection failed:', error);
    return NextResponse.json({
      error: 'Failed to collect metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

interface AppMetrics {
  timestamp: string;
  uptime: number;
  process: {
    pid: number;
    version: string;
    platform: string;
    arch: string;
  };
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
    heapUsedPercent: number;
  };
  cpu: {
    userCpuTime: number;
    systemCpuTime: number;
  };
  environment: {
    nodeEnv: string;
    version: string;
  };
  configuration: {
    firebaseConfigured: boolean;
    claudeApiConfigured: boolean;
    monitoringEnabled: boolean;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: string;
  };
}

/**
 * Collect comprehensive application metrics
 */
async function collectMetrics(): Promise<AppMetrics> {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  // Calculate heap usage percentage
  const heapUsedPercent = memUsage.heapTotal > 0 
    ? Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    : 0;
  
  // Check configuration status
  const firebaseConfigured = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
  
  const claudeApiConfigured = !!(
    process.env.CLAUDE_API_KEY
  );
  
  const monitoringEnabled = process.env.NEXT_PUBLIC_MONITORING_ENABLED === 'true';
  
  // Quick health assessment
  const isMemoryHealthy = memUsage.heapUsed < (512 * 1024 * 1024); // 512MB threshold
  const isConfigurationHealthy = firebaseConfigured;
  const overallHealthy = isMemoryHealthy && isConfigurationHealthy;
  
  const healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 
    overallHealthy ? 'healthy' : 
    (isConfigurationHealthy ? 'degraded' : 'unhealthy');
  
  return {
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      heapUsedPercent,
    },
    cpu: {
      userCpuTime: cpuUsage.user,
      systemCpuTime: cpuUsage.system,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '1.0.0',
    },
    configuration: {
      firebaseConfigured,
      claudeApiConfigured,
      monitoringEnabled,
    },
    health: {
      status: healthStatus,
      lastCheck: new Date().toISOString(),
    },
  };
}

/**
 * Format metrics in Prometheus format
 */
function formatPrometheusMetrics(metrics: AppMetrics): string {
  const lines: string[] = [];
  const timestamp = Date.now();
  
  // Add metric with help text and type
  const addMetric = (name: string, help: string, type: string, value: number | string, labels: Record<string, string> = {}) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
    
    const labelStr = Object.keys(labels).length > 0 
      ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` 
      : '';
    
    lines.push(`${name}${labelStr} ${value} ${timestamp}`);
    lines.push('');
  };
  
  // Process metrics
  addMetric('app_uptime_seconds', 'Application uptime in seconds', 'counter', metrics.uptime);
  addMetric('app_info', 'Application information', 'gauge', 1, {
    version: metrics.environment.version,
    node_version: metrics.process.version,
    platform: metrics.process.platform,
    arch: metrics.process.arch,
    env: metrics.environment.nodeEnv,
  });
  
  // Memory metrics
  addMetric('app_memory_rss_bytes', 'Resident Set Size memory', 'gauge', metrics.memory.rss);
  addMetric('app_memory_heap_total_bytes', 'Total heap memory', 'gauge', metrics.memory.heapTotal);
  addMetric('app_memory_heap_used_bytes', 'Used heap memory', 'gauge', metrics.memory.heapUsed);
  addMetric('app_memory_heap_used_percent', 'Percentage of heap memory used', 'gauge', metrics.memory.heapUsedPercent);
  addMetric('app_memory_external_bytes', 'External memory', 'gauge', metrics.memory.external);
  addMetric('app_memory_array_buffers_bytes', 'Array buffers memory', 'gauge', metrics.memory.arrayBuffers);
  
  // CPU metrics
  addMetric('app_cpu_user_time_microseconds', 'User CPU time in microseconds', 'counter', metrics.cpu.userCpuTime);
  addMetric('app_cpu_system_time_microseconds', 'System CPU time in microseconds', 'counter', metrics.cpu.systemCpuTime);
  
  // Configuration metrics
  addMetric('app_firebase_configured', 'Firebase configuration status', 'gauge', metrics.configuration.firebaseConfigured ? 1 : 0);
  addMetric('app_claude_api_configured', 'Claude API configuration status', 'gauge', metrics.configuration.claudeApiConfigured ? 1 : 0);
  addMetric('app_monitoring_enabled', 'Monitoring enabled status', 'gauge', metrics.configuration.monitoringEnabled ? 1 : 0);
  
  // Health metrics
  const healthValue = metrics.health.status === 'healthy' ? 1 : 
                     metrics.health.status === 'degraded' ? 0.5 : 0;
  addMetric('app_health_status', 'Application health status (1=healthy, 0.5=degraded, 0=unhealthy)', 'gauge', healthValue);
  
  return lines.join('\n');
}