import { POST } from '../csp-report/route';
import { NextRequest } from 'next/server';

describe('/api/csp-report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid test output clutter
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('should accept and log a valid CSP violation report', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const cspReport = {
        'csp-report': {
          'document-uri': 'https://example.com/page',
          'referrer': 'https://example.com',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "default-src 'self'; script-src 'self'",
          'disposition': 'enforce',
          'blocked-uri': 'https://evil.com/script.js',
          'status-code': 200,
          'script-sample': ''
        }
      };

      const mockHeaders = new Headers({
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '192.168.1.1'
      });

      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: JSON.stringify(cspReport),
        headers: mockHeaders,
      });

      // Mock request.ip
      Object.defineProperty(request, 'ip', {
        value: '192.168.1.100',
        writable: true
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('report received');

      // Verify console.warn was called with proper structure
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'CSP Violation Report:',
        expect.objectContaining({
          timestamp: expect.any(String),
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ip: '192.168.1.100',
          report: cspReport
        })
      );

      // Verify timestamp format
      const callArgs = consoleWarnSpy.mock.calls[0][1];
      expect(new Date(callArgs.timestamp).getTime()).toBeCloseTo(Date.now(), -3);
    });

    it('should handle request with x-forwarded-for header when ip is not available', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const cspReport = {
        'csp-report': {
          'document-uri': 'https://example.com',
          'violated-directive': 'img-src'
        }
      };

      const mockHeaders = new Headers({
        'user-agent': 'Mozilla/5.0 Test Browser',
        'x-forwarded-for': '10.0.0.1'
      });

      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: JSON.stringify(cspReport),
        headers: mockHeaders,
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const callArgs = consoleWarnSpy.mock.calls[0][1];
      expect(callArgs.ip).toBe('10.0.0.1');
    });

    it('should handle request with no IP information', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const cspReport = {
        'csp-report': {
          'document-uri': 'https://example.com',
          'violated-directive': 'style-src'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: JSON.stringify(cspReport),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const callArgs = consoleWarnSpy.mock.calls[0][1];
      expect(callArgs.ip).toBe('unknown');
    });

    it('should handle empty CSP report', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('report received');
      
      const callArgs = consoleWarnSpy.mock.calls[0][1];
      expect(callArgs.report).toEqual({});
    });

    it('should handle CSP report with all possible fields', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const comprehensiveCspReport = {
        'csp-report': {
          'document-uri': 'https://example.com/secure-page',
          'referrer': 'https://example.com/previous-page',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'",
          'disposition': 'enforce',
          'blocked-uri': 'https://malicious.com/evil-script.js',
          'line-number': 42,
          'column-number': 15,
          'source-file': 'https://example.com/js/app.js',
          'status-code': 200,
          'script-sample': 'console.log("blocked")'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: JSON.stringify(comprehensiveCspReport),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const callArgs = consoleWarnSpy.mock.calls[0][1];
      expect(callArgs.report).toEqual(comprehensiveCspReport);
    });

    it('should handle multiple violation types', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const testCases = [
        { 'violated-directive': 'script-src' },
        { 'violated-directive': 'style-src' },
        { 'violated-directive': 'img-src' },
        { 'violated-directive': 'connect-src' },
        { 'violated-directive': 'font-src' },
        { 'violated-directive': 'object-src' },
        { 'violated-directive': 'media-src' }
      ];

      for (const testCase of testCases) {
        const cspReport = { 'csp-report': testCase };
        
        const request = new NextRequest('http://localhost:3000/api/csp-report', {
          method: 'POST',
          body: JSON.stringify(cspReport),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }

      expect(consoleWarnSpy).toHaveBeenCalledTimes(testCases.length);
    });
  });

  describe('Error Cases', () => {
    it('should return 400 for malformed JSON', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: 'invalid json content',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid report format');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error processing CSP report:',
        expect.any(Error)
      );
    });

    it('should handle request body parsing errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock request.json to throw an error
      const request = {
        ip: '127.0.0.1',
        headers: new Headers({ 'user-agent': 'Test Browser' }),
        json: jest.fn().mockRejectedValue(new Error('Body parsing failed'))
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid report format');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error processing CSP report:',
        expect.objectContaining({
          message: 'Body parsing failed'
        })
      );
    });

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid report format');
    });

    it('should handle network/connection errors during processing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock console.warn to throw an error (simulating a logging service failure)
      const originalConsoleWarn = console.warn;
      console.warn = jest.fn().mockImplementation(() => {
        throw new Error('Logging service unavailable');
      });

      const cspReport = {
        'csp-report': {
          'document-uri': 'https://example.com',
          'violated-directive': 'script-src'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: JSON.stringify(cspReport),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid report format');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error processing CSP report:',
        expect.objectContaining({
          message: 'Logging service unavailable'
        })
      );

      // Restore original console.warn
      console.warn = originalConsoleWarn;
    });
  });

  describe('Security and Edge Cases', () => {
    it('should handle extremely large CSP reports', async () => {
      const largeCspReport = {
        'csp-report': {
          'document-uri': 'https://example.com',
          'violated-directive': 'script-src',
          'large-field': 'x'.repeat(10000), // 10KB field
          'script-sample': 'console.log("' + 'a'.repeat(5000) + '");'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: JSON.stringify(largeCspReport),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle CSP reports with special characters and encoding', async () => {
      const specialCharsCspReport = {
        'csp-report': {
          'document-uri': 'https://example.com/page?param=value&other=测试',
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.com/script.js?param=<script>alert("xss")</script>',
          'script-sample': 'console.log("Special chars: ñáéíóú 中文 🚀");'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: JSON.stringify(specialCharsCspReport),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle null values in CSP report fields', async () => {
      const cspReportWithNulls = {
        'csp-report': {
          'document-uri': 'https://example.com',
          'violated-directive': 'script-src',
          'referrer': null,
          'source-file': null,
          'line-number': null,
          'column-number': null
        }
      };

      const request = new NextRequest('http://localhost:3000/api/csp-report', {
        method: 'POST',
        body: JSON.stringify(cspReportWithNulls),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle various user agent strings', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const userAgentStrings = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        'PostmanRuntime/7.28.4',
        '',
        null
      ];

      for (const userAgent of userAgentStrings) {
        consoleWarnSpy.mockClear();
        
        const headers = new Headers();
        if (userAgent) {
          headers.set('user-agent', userAgent);
        }

        const request = new NextRequest('http://localhost:3000/api/csp-report', {
          method: 'POST',
          body: JSON.stringify({ 'csp-report': { 'violated-directive': 'test' } }),
          headers,
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        
        const callArgs = consoleWarnSpy.mock.calls[0][1];
        expect(callArgs.userAgent).toBe(userAgent || null);
      }
    });

    it('should handle rapid successive CSP reports', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const cspReport = {
          'csp-report': {
            'document-uri': `https://example.com/page${i}`,
            'violated-directive': 'script-src',
            'blocked-uri': `https://evil.com/script${i}.js`
          }
        };

        const request = new NextRequest('http://localhost:3000/api/csp-report', {
          method: 'POST',
          body: JSON.stringify(cspReport),
        });

        promises.push(POST(request));
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(consoleWarnSpy).toHaveBeenCalledTimes(10);
    });
  });
});