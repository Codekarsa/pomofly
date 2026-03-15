/**
 * Type definitions for health check endpoints
 */

export interface BasicHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: 'pomofly';
  version: string;
  uptime: number;
  environment: string;
  error?: string;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface DetailedHealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: 'pomofly';
  version: string;
  environment: string;
  uptime: number;
  checks: HealthCheck[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

export interface ReadinessResponse {
  ready: boolean;
  timestamp: string;
  service: 'pomofly';
  checks: {
    firebase: { ready: boolean; error?: string };
    environment: { ready: boolean; error?: string; missing?: string[] };
  };
  error?: string;
}

export interface LivenessResponse {
  alive: boolean;
  timestamp: string;
  service: 'pomofly';
  uptime: number;
  pid: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  error?: string;
}

export interface FirebaseAuthCheck {
  configured: boolean;
  currentUser: 'authenticated' | 'anonymous';
}

export interface FirestoreCheck {
  connected: boolean;
  testDocExists: boolean;
}

export interface ClaudeAPICheck {
  configured: boolean;
  model: string;
  apiKeyConfigured: boolean;
}

export interface EnvironmentVariablesCheck {
  required: number;
  present: number;
  missing: number;
  missingVars: string[];
}

export interface MemoryUsageCheck {
  heapUsed: string;
  heapTotal: string;
  rss: string;
  external: string;
  heapUsagePercent: number;
}

// Utility types for health status
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

// Health check names enum for type safety
export enum HealthCheckName {
  FIREBASE_AUTH = 'firebase_auth',
  FIRESTORE = 'firestore',
  CLAUDE_API = 'claude_api',
  ENVIRONMENT_VARIABLES = 'environment_variables',
  MEMORY_USAGE = 'memory_usage',
}

// Health check timeout configurations
export const HEALTH_CHECK_TIMEOUTS = {
  BASIC: 1000, // 1 second
  DETAILED: 10000, // 10 seconds
  READINESS: 3000, // 3 seconds
  LIVENESS: 1000, // 1 second
} as const;

// Health check intervals for monitoring
export const HEALTH_CHECK_INTERVALS = {
  BASIC: 30000, // 30 seconds
  DETAILED: 60000, // 1 minute
  READINESS: 10000, // 10 seconds
  LIVENESS: 5000, // 5 seconds
} as const;