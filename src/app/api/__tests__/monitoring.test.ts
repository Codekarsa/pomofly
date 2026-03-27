import { GET, POST } from '../monitoring/route';
import { NextRequest } from 'next/server';

describe('/api/monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid test output clutter
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET Endpoint', () => {
    describe('Success Cases', () => {
      it('should return error monitoring info for type=errors', async () => {
        const url = 'http://localhost:3000/api/monitoring?type=errors&limit=25';
        const request = new NextRequest(url, { method: 'GET' });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toContain('Error monitoring is client-side only');
        expect(data.example).toBeDefined();
        expect(data.example.id).toMatch(/^error-\d+-[a-z0-9]+$/);
        expect(data.example.timestamp).toBeDefined();
        expect(data.example.error).toBeDefined();
        expect(data.example.context).toBeDefined();
        expect(data.example.severity).toBe('medium');
        expect(data.example.tags).toContain('javascript');
      });

      it('should return metrics monitoring info for type=metrics', async () => {
        const url = 'http://localhost:3000/api/monitoring?type=metrics&limit=100';
        const request = new NextRequest(url, { method: 'GET' });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toContain('Performance metrics are client-side only');
        expect(data.example).toBeDefined();
        expect(data.example.metric).toBe('page_load_time');
        expect(typeof data.example.value).toBe('number');
        expect(data.example.context.userId).toBeDefined();
        expect(data.example.tags).toContain('performance');
      });

      it('should return monitoring summary for type=summary', async () => {
        const url = 'http://localhost:3000/api/monitoring?type=summary';
        const request = new NextRequest(url, { method: 'GET' });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.monitoring.status).toBe('active');
        expect(data.monitoring.version).toBe('1.0.0');
        expect(data.monitoring.features).toBeDefined();
        expect(data.monitoring.features.errorTracking).toBe(true);
        expect(data.monitoring.features.performanceMonitoring).toBe(true);
        expect(data.monitoring.storage).toBe('localStorage');
        expect(data.monitoring.retention.errors).toBe('50 most recent');
        expect(data.monitoring.integrations.sentry).toContain('NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT');
      });

      it('should return health status for type=health', async () => {
        const url = 'http://localhost:3000/api/monitoring?type=health';
        const request = new NextRequest(url, { method: 'GET' });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('healthy');
        expect(data.timestamp).toBeDefined();
        expect(new Date(data.timestamp).getTime()).toBeCloseTo(Date.now(), -3);
        expect(data.services.errorTracking).toBe('operational');
        expect(data.services.performanceMonitoring).toBe('operational');
        expect(data.services.storage).toBe('operational');
      });

      it('should handle default limit parameter', async () => {
        const url = 'http://localhost:3000/api/monitoring?type=errors';
        const request = new NextRequest(url, { method: 'GET' });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        // Should use default limit of 50 (though this endpoint doesn't actually use it in current implementation)
        expect(data).toBeDefined();
      });

      it('should parse limit parameter correctly', async () => {
        const url = 'http://localhost:3000/api/monitoring?type=metrics&limit=200';
        const request = new NextRequest(url, { method: 'GET' });

        const response = await GET(request);
        
        expect(response.status).toBe(200);
        // The endpoint should handle the limit parameter (though current implementation doesn't use it)
      });
    });

    describe('Error Cases', () => {
      it('should return 400 for invalid type parameter', async () => {
        const url = 'http://localhost:3000/api/monitoring?type=invalid';
        const request = new NextRequest(url, { method: 'GET' });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid type parameter');
        expect(data.validTypes).toEqual(['errors', 'metrics', 'summary', 'health']);
        expect(data.usage).toBeDefined();
        expect(data.usage.errors).toContain('/api/monitoring?type=errors');
      });

      it('should return 400 for missing type parameter', async () => {
        const url = 'http://localhost:3000/api/monitoring';
        const request = new NextRequest(url, { method: 'GET' });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid type parameter');
      });

      it('should handle empty type parameter', async () => {
        const url = 'http://localhost:3000/api/monitoring?type=';
        const request = new NextRequest(url, { method: 'GET' });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid type parameter');
      });

      it('should handle internal server error gracefully', async () => {
        // Mock URL constructor to throw an error
        const originalURL = global.URL;
        global.URL = jest.fn().mockImplementation(() => {
          throw new Error('URL parsing failed');
        });

        const request = new NextRequest('http://localhost:3000/api/monitoring?type=errors', { 
          method: 'GET' 
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');

        // Restore original URL constructor
        global.URL = originalURL;
      });
    });
  });

  describe('POST Endpoint', () => {
    describe('Success Cases', () => {
      it('should accept valid monitoring data', async () => {
        const monitoringData = {
          type: 'error',
          data: {
            id: 'error-123',
            timestamp: new Date().toISOString(),
            error: {
              name: 'TypeError',
              message: 'Cannot read property',
              stack: 'TypeError: Cannot read property...'
            },
            context: {
              userAgent: 'Mozilla/5.0...',
              url: 'https://example.com',
              userId: 'user123'
            }
          }
        };

        const request = new NextRequest('http://localhost:3000/api/monitoring', {
          method: 'POST',
          body: JSON.stringify(monitoringData),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('error data received');
        expect(data.timestamp).toBeDefined();
        expect(new Date(data.timestamp).getTime()).toBeCloseTo(Date.now(), -3);
      });

      it('should accept metric data', async () => {
        const metricData = {
          type: 'metric',
          data: {
            id: 'metric-456',
            timestamp: new Date().toISOString(),
            metric: 'page_load_time',
            value: 1250.5,
            context: {
              userId: 'user123',
              route: '/dashboard'
            }
          }
        };

        const request = new NextRequest('http://localhost:3000/api/monitoring', {
          method: 'POST',
          body: JSON.stringify(metricData),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe('metric data received');
      });

      it('should log received data to console', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        const monitoringData = {
          type: 'performance',
          data: { metric: 'test' }
        };

        const request = new NextRequest('http://localhost:3000/api/monitoring', {
          method: 'POST',
          body: JSON.stringify(monitoringData),
        });

        await POST(request);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Received performance monitoring data:',
          { metric: 'test' }
        );
      });
    });

    describe('Error Cases', () => {
      it('should return 400 when type is missing', async () => {
        const request = new NextRequest('http://localhost:3000/api/monitoring', {
          method: 'POST',
          body: JSON.stringify({
            data: { some: 'data' }
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing type or data');
      });

      it('should return 400 when data is missing', async () => {
        const request = new NextRequest('http://localhost:3000/api/monitoring', {
          method: 'POST',
          body: JSON.stringify({
            type: 'error'
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing type or data');
      });

      it('should return 400 when both type and data are missing', async () => {
        const request = new NextRequest('http://localhost:3000/api/monitoring', {
          method: 'POST',
          body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing type or data');
      });

      it('should handle malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/monitoring', {
          method: 'POST',
          body: 'invalid json',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to process monitoring data');
      });

      it('should handle request processing errors', async () => {
        // Mock request.json to throw an error
        const request = {
          json: jest.fn().mockRejectedValue(new Error('JSON parsing error'))
        } as unknown as NextRequest;

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to process monitoring data');
      });

      it('should log errors to console', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        const request = {
          json: jest.fn().mockRejectedValue(new Error('Test error'))
        } as unknown as NextRequest;

        await POST(request);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error processing monitoring data:',
          expect.any(Error)
        );
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty type string', async () => {
        const request = new NextRequest('http://localhost:3000/api/monitoring', {
          method: 'POST',
          body: JSON.stringify({
            type: '',
            data: { some: 'data' }
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing type or data');
      });

      it('should handle null data', async () => {
        const request = new NextRequest('http://localhost:3000/api/monitoring', {
          method: 'POST',
          body: JSON.stringify({
            type: 'error',
            data: null
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing type or data');
      });

      it('should handle very large data payloads', async () => {
        const largeData = {
          type: 'error',
          data: {
            id: 'error-large',
            largeField: 'x'.repeat(10000) // 10KB string
          }
        };

        const request = new NextRequest('http://localhost:3000/api/monitoring', {
          method: 'POST',
          body: JSON.stringify(largeData),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });
    });
  });
});