/**
 * @jest-environment jsdom
 */

import { 
  calculateCutoffDate, 
  getRetentionPolicy, 
  validateCleanupRequest,
  calculateComplianceScore,
  formatRetentionDuration,
  generateComplianceReport,
  getNextCleanupSchedule,
  DATA_RETENTION_POLICIES
} from '../dataRetention';

describe('Data Retention Utilities', () => {
  describe('calculateCutoffDate', () => {
    it('should calculate correct cutoff date for 7 days', () => {
      const cutoff = calculateCutoffDate(7);
      const expected = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Allow for small timing differences (within 1 second)
      expect(Math.abs(cutoff.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('should calculate correct cutoff date for 30 days', () => {
      const cutoff = calculateCutoffDate(30);
      const expected = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      expect(Math.abs(cutoff.getTime() - expected.getTime())).toBeLessThan(1000);
    });
  });

  describe('getRetentionPolicy', () => {
    it('should return policy for valid collection', () => {
      const policy = getRetentionPolicy('guest_sessions');
      
      expect(policy).toBeDefined();
      expect(policy?.collection).toBe('guest_sessions');
      expect(policy?.retentionDays).toBe(7);
    });

    it('should return undefined for invalid collection', () => {
      const policy = getRetentionPolicy('invalid_collection');
      
      expect(policy).toBeUndefined();
    });

    it('should have all expected policies defined', () => {
      const expectedCollections = [
        'guest_sessions',
        'system_logs',
        'error_reports',
        'analytics_events',
        'estimation_history',
        'users'
      ];

      expectedCollections.forEach(collection => {
        const policy = getRetentionPolicy(collection);
        expect(policy).toBeDefined();
        expect(policy?.collection).toBe(collection);
      });
    });
  });

  describe('validateCleanupRequest', () => {
    it('should validate correct cleanup types', () => {
      const validTypes = [
        'guest-sessions',
        'system-logs',
        'error-reports',
        'analytics',
        'estimation-history',
        'inactive-users',
        'daily',
        'weekly',
        'monthly',
        'all'
      ];

      validTypes.forEach(type => {
        expect(validateCleanupRequest(type)).toBe(true);
      });
    });

    it('should reject invalid cleanup types', () => {
      const invalidTypes = [
        'invalid',
        'random',
        '',
        'DAILY',
        'guest_sessions'
      ];

      invalidTypes.forEach(type => {
        expect(validateCleanupRequest(type)).toBe(false);
      });
    });
  });

  describe('calculateComplianceScore', () => {
    it('should return 100% for no expired items', () => {
      expect(calculateComplianceScore(100, 0)).toBe(100);
    });

    it('should return 0% for all expired items', () => {
      expect(calculateComplianceScore(100, 100)).toBe(0);
    });

    it('should return 50% for half expired items', () => {
      expect(calculateComplianceScore(100, 50)).toBe(50);
    });

    it('should return 100% for zero total items', () => {
      expect(calculateComplianceScore(0, 0)).toBe(100);
    });

    it('should round to nearest integer', () => {
      expect(calculateComplianceScore(100, 33)).toBe(67);
    });
  });

  describe('formatRetentionDuration', () => {
    it('should format days correctly', () => {
      expect(formatRetentionDuration(1)).toBe('1 day');
      expect(formatRetentionDuration(7)).toBe('7 days');
      expect(formatRetentionDuration(15)).toBe('15 days');
    });

    it('should format months correctly', () => {
      expect(formatRetentionDuration(30)).toBe('1 month');
      expect(formatRetentionDuration(60)).toBe('2 months');
      expect(formatRetentionDuration(180)).toBe('6 months');
    });

    it('should format years correctly', () => {
      expect(formatRetentionDuration(365)).toBe('1 year');
      expect(formatRetentionDuration(730)).toBe('2 years');
    });
  });

  describe('generateComplianceReport', () => {
    it('should return excellent status for high compliance', () => {
      const mockStats = {
        summary: { overallCompliance: 99 }
      };

      const report = generateComplianceReport(mockStats);
      
      expect(report.status).toBe('excellent');
      expect(report.message).toContain('excellent');
      expect(report.recommendations).toHaveLength(2);
    });

    it('should return good status for decent compliance', () => {
      const mockStats = {
        summary: { overallCompliance: 96 }
      };

      const report = generateComplianceReport(mockStats);
      
      expect(report.status).toBe('good');
      expect(report.message).toContain('good');
    });

    it('should return warning status for poor compliance', () => {
      const mockStats = {
        summary: { overallCompliance: 87 }
      };

      const report = generateComplianceReport(mockStats);
      
      expect(report.status).toBe('warning');
      expect(report.message).toContain('attention');
    });

    it('should return critical status for very poor compliance', () => {
      const mockStats = {
        summary: { overallCompliance: 75 }
      };

      const report = generateComplianceReport(mockStats);
      
      expect(report.status).toBe('critical');
      expect(report.message).toContain('Critical');
    });
  });

  describe('getNextCleanupSchedule', () => {
    it('should return valid ISO dates for all cleanup types', () => {
      const schedule = getNextCleanupSchedule();
      
      expect(schedule).toHaveProperty('daily');
      expect(schedule).toHaveProperty('weekly');
      expect(schedule).toHaveProperty('monthly');
      
      // Check if dates are valid ISO strings
      expect(new Date(schedule.daily).toISOString()).toBe(schedule.daily);
      expect(new Date(schedule.weekly).toISOString()).toBe(schedule.weekly);
      expect(new Date(schedule.monthly).toISOString()).toBe(schedule.monthly);
      
      // Check if dates are in the future
      const now = new Date();
      expect(new Date(schedule.daily).getTime()).toBeGreaterThan(now.getTime());
      expect(new Date(schedule.weekly).getTime()).toBeGreaterThan(now.getTime());
      expect(new Date(schedule.monthly).getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('DATA_RETENTION_POLICIES', () => {
    it('should have consistent structure for all policies', () => {
      DATA_RETENTION_POLICIES.forEach(policy => {
        expect(policy).toHaveProperty('name');
        expect(policy).toHaveProperty('collection');
        expect(policy).toHaveProperty('retentionDays');
        expect(policy).toHaveProperty('dateField');
        expect(policy).toHaveProperty('description');
        
        expect(typeof policy.name).toBe('string');
        expect(typeof policy.collection).toBe('string');
        expect(typeof policy.retentionDays).toBe('number');
        expect(typeof policy.dateField).toBe('string');
        expect(typeof policy.description).toBe('string');
        
        expect(policy.retentionDays).toBeGreaterThan(0);
        expect(policy.name.length).toBeGreaterThan(0);
        expect(policy.collection.length).toBeGreaterThan(0);
        expect(policy.dateField.length).toBeGreaterThan(0);
        expect(policy.description.length).toBeGreaterThan(0);
      });
    });

    it('should have unique collection names', () => {
      const collections = DATA_RETENTION_POLICIES.map(p => p.collection);
      const uniqueCollections = new Set(collections);
      
      expect(collections.length).toBe(uniqueCollections.size);
    });

    it('should have reasonable retention periods', () => {
      DATA_RETENTION_POLICIES.forEach(policy => {
        // All periods should be between 1 day and 5 years
        expect(policy.retentionDays).toBeGreaterThanOrEqual(1);
        expect(policy.retentionDays).toBeLessThanOrEqual(1825); // 5 years
      });
    });
  });
});