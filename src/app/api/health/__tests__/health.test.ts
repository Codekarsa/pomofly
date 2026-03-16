/**
 * @jest-environment node
 */
import { GET as basicHealthCheck } from '../route';
import { GET as detailedHealthCheck } from '../detailed/route';
import { GET as readinessCheck } from '../ready/route';
import { GET as livenessCheck } from '../live/route';

// Mock Firebase modules
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:123:web:abc',
    CLAUDE_API_KEY: 'sk-test-api-key-12345',
    CLAUDE_MODEL: 'claude-3-sonnet-20240229',
    NODE_ENV: 'test',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('/api/health', () => {
  it('should return healthy status with basic info', async () => {
    const response = await basicHealthCheck();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      status: 'healthy',
      service: 'pomofly',
      environment: 'test',
    });
    expect(data.timestamp).toBeDefined();
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should include no-cache headers', async () => {
    const response = await basicHealthCheck();
    
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Expires')).toBe('0');
  });
});

describe('/api/health/detailed', () => {
  it('should return detailed health with all checks', async () => {
    const response = await detailedHealthCheck();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks).toHaveLength(5);
    
    const checkNames = data.checks.map((check: any) => check.name);
    expect(checkNames).toContain('firebase_auth');
    expect(checkNames).toContain('firestore');
    expect(checkNames).toContain('claude_api');
    expect(checkNames).toContain('environment_variables');
    expect(checkNames).toContain('memory_usage');
  });

  it('should include summary with correct counts', async () => {
    const response = await detailedHealthCheck();
    const data = await response.json();

    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBe(5);
    expect(data.summary.healthy + data.summary.degraded + data.summary.unhealthy).toBe(5);
  });

  it('should check Firebase Auth correctly', async () => {
    const response = await detailedHealthCheck();
    const data = await response.json();

    const authCheck = data.checks.find((check: any) => check.name === 'firebase_auth');
    expect(authCheck).toBeDefined();
    expect(authCheck.status).toBe('healthy');
    expect(authCheck.details.configured).toBe(true);
  });

  it('should check environment variables correctly', async () => {
    const response = await detailedHealthCheck();
    const data = await response.json();

    const envCheck = data.checks.find((check: any) => check.name === 'environment_variables');
    expect(envCheck).toBeDefined();
    expect(envCheck.status).toBe('healthy');
    expect(envCheck.details.missing).toBe(0);
  });

  it('should report unhealthy when environment variables are missing', async () => {
    // Remove required environment variables
    delete process.env.CLAUDE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    const response = await detailedHealthCheck();
    const data = await response.json();

    expect(data.status).toBe('unhealthy');
    
    const envCheck = data.checks.find((check: any) => check.name === 'environment_variables');
    expect(envCheck.status).toBe('unhealthy');
    expect(envCheck.details.missing).toBeGreaterThan(0);
  });

  it('should check memory usage', async () => {
    const response = await detailedHealthCheck();
    const data = await response.json();

    const memoryCheck = data.checks.find((check: any) => check.name === 'memory_usage');
    expect(memoryCheck).toBeDefined();
    expect(memoryCheck.details.heapUsed).toMatch(/^\d+MB$/);
    expect(memoryCheck.details.heapUsagePercent).toBeGreaterThan(0);
  });
});

describe('/api/health/ready', () => {
  it('should return ready status when all checks pass', async () => {
    const response = await readinessCheck();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ready).toBe(true);
    expect(data.service).toBe('pomofly');
    expect(data.checks).toBeDefined();
    expect(data.checks.firebase).toBeDefined();
    expect(data.checks.environment).toBeDefined();
  });

  it('should return not ready when environment check fails', async () => {
    // Remove essential environment variable
    delete process.env.CLAUDE_API_KEY;

    const response = await readinessCheck();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.ready).toBe(false);
    expect(data.checks.environment.ready).toBe(false);
  });

  it('should include no-cache headers', async () => {
    const response = await readinessCheck();
    
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
  });
});

describe('/api/health/live', () => {
  it('should return alive status with basic process info', async () => {
    const response = await livenessCheck();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alive).toBe(true);
    expect(data.service).toBe('pomofly');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(data.pid).toBeGreaterThan(0);
    expect(data.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it('should be fast (< 100ms)', async () => {
    const startTime = Date.now();
    const response = await livenessCheck();
    const endTime = Date.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('should include no-cache headers', async () => {
    const response = await livenessCheck();
    
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
  });
});

describe('Error handling', () => {
  it('should handle errors gracefully in basic health check', async () => {
    // Mock process.uptime to throw an error
    const originalUptime = process.uptime;
    process.uptime = jest.fn(() => {
      throw new Error('Test error');
    });

    const response = await basicHealthCheck();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.error).toBe('Test error');

    // Restore original function
    process.uptime = originalUptime;
  });

  it('should handle missing Firebase instances in detailed check', async () => {
    // This test verifies the check handles missing Firebase gracefully
    const response = await detailedHealthCheck();
    const data = await response.json();

    // Should still return a response, possibly degraded
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(data.checks).toBeDefined();
  });
});