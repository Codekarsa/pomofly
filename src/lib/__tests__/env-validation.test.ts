import { validateEnvironment, getSetupInstructions, createDegradationPlan } from '../env-validation';

// Mock environment variables
const originalEnv = process.env;

describe('Environment Validation', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should pass with all required Firebase variables', () => {
      // Set all required environment variables
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef123456';

      const result = validateEnvironment();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firebase.apiKey).toBe('test-api-key');
        expect(result.data.firebase.projectId).toBe('test-project');
      }
    });

    it('should fail with missing required Firebase variables', () => {
      // Clear all environment variables
      delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      const result = validateEnvironment();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('NEXT_PUBLIC_FIREBASE_API_KEY is required and cannot be empty');
        expect(result.errors).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN must be a valid Firebase domain (*.firebaseapp.com)');
        expect(result.errors).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required and cannot be empty');
      }
    });

    it('should validate Firebase domain format', () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-key';
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'invalid-domain.com'; // Invalid format
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef123456';

      const result = validateEnvironment();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN must be a valid Firebase domain (*.firebaseapp.com)');
      }
    });

    it('should validate Firebase App ID format', () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-key';
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'invalid-app-id'; // Invalid format

      const result = validateEnvironment();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('NEXT_PUBLIC_FIREBASE_APP_ID must be a valid Firebase web app ID (1:*:web:*)');
      }
    });

    it('should warn about missing Claude configuration', () => {
      // Set required Firebase vars but not Claude
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef123456';
      
      // No Claude API key

      const result = validateEnvironment();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toContain('Claude API key not configured - AI task breakdown features will be disabled');
      }
    });

    it('should handle Claude configuration correctly', () => {
      // Set all Firebase + Claude vars
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.appspot.com';
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef123456';
      process.env.CLAUDE_API_KEY = 'claude-test-key';
      process.env.CLAUDE_MODEL = 'claude-3-haiku-20240307';

      const result = validateEnvironment();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.claude.apiKey).toBe('claude-test-key');
        expect(result.data.claude.model).toBe('claude-3-haiku-20240307');
        expect(result.warnings).not.toContain('Claude API key not configured - AI task breakdown features will be disabled');
      }
    });
  });

  describe('createDegradationPlan', () => {
    it('should create correct degradation plan for successful validation', () => {
      const mockResult = {
        success: true,
        data: {
          firebase: {} as any,
          claude: { apiKey: 'test-key', model: 'test-model' },
          monitoring: { enabled: true, sampleRate: 1.0, debug: false }
        },
        warnings: []
      };

      const plan = createDegradationPlan(mockResult);

      expect(plan.firebaseAvailable).toBe(true);
      expect(plan.claudeAvailable).toBe(true);
      expect(plan.supportedFeatures).toContain('User authentication');
      expect(plan.supportedFeatures).toContain('AI task breakdown');
    });

    it('should create correct degradation plan for failed validation', () => {
      const mockResult = {
        success: false,
        errors: ['Firebase configuration missing'],
        warnings: []
      };

      const plan = createDegradationPlan(mockResult);

      expect(plan.firebaseAvailable).toBe(false);
      expect(plan.claudeAvailable).toBe(false);
      expect(plan.monitoringAvailable).toBe(false);
      expect(plan.disabledFeatures).toContain('All Firebase features');
    });
  });

  describe('getSetupInstructions', () => {
    it('should return empty array for successful validation', () => {
      const mockResult = {
        success: true,
        data: {} as any,
        warnings: []
      };

      const instructions = getSetupInstructions(mockResult);
      expect(instructions).toEqual([]);
    });

    it('should return setup instructions for failed validation', () => {
      const mockResult = {
        success: false,
        errors: ['Firebase API key missing'],
        warnings: []
      };

      const instructions = getSetupInstructions(mockResult);
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions.join(' ')).toContain('Firebase Console');
      expect(instructions.join(' ')).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
    });
  });
});