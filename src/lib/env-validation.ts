import { z } from "zod";

// Firebase configuration schema - all required for app functionality
const firebaseConfigSchema = z.object({
  apiKey: z.string().min(1, "Firebase API key is required"),
  authDomain: z.string().min(1, "Firebase Auth domain is required").regex(
    /^[a-zA-Z0-9-]+\.firebaseapp\.com$/,
    "Auth domain must be a valid Firebase domain (*.firebaseapp.com)"
  ),
  projectId: z.string().min(1, "Firebase Project ID is required"),
  storageBucket: z.string().min(1, "Firebase Storage bucket is required").regex(
    /^[a-zA-Z0-9-]+\.appspot\.com$/,
    "Storage bucket must be a valid Firebase bucket (*.appspot.com)"
  ),
  messagingSenderId: z.string().min(1, "Firebase Messaging sender ID is required"),
  appId: z.string().min(1, "Firebase App ID is required").regex(
    /^1:[0-9]+:web:[a-zA-Z0-9]+$/,
    "App ID must be a valid Firebase web app ID"
  )
});

// Claude AI configuration schema - optional but validated when present
const claudeConfigSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().optional().default("claude-3-haiku-20240307")
});

// Monitoring configuration schema - optional
const monitoringConfigSchema = z.object({
  enabled: z.string().optional().transform(val => val === "true"),
  sampleRate: z.string().optional().transform(val => parseFloat(val || "1.0")),
  debug: z.string().optional().transform(val => val === "true"),
  errorTrackingEndpoint: z.string().url().optional(),
  metricsEndpoint: z.string().url().optional()
});

// Complete environment validation schema
export const envSchema = z.object({
  firebase: firebaseConfigSchema,
  claude: claudeConfigSchema,
  monitoring: monitoringConfigSchema
});

// Type for validated environment
export type ValidatedEnv = z.infer<typeof envSchema>;

// Validation result types
export type ValidationResult = {
  success: true;
  data: ValidatedEnv;
  warnings: string[];
} | {
  success: false;
  errors: string[];
  warnings: string[];
};

/**
 * Validate environment variables with comprehensive error reporting
 */
export function validateEnvironment(): ValidationResult {
  const warnings: string[] = [];
  
  // Extract Firebase config from environment
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

  // Extract Claude config from environment
  const claudeConfig = {
    apiKey: process.env.CLAUDE_API_KEY,
    model: process.env.CLAUDE_MODEL
  };

  // Extract monitoring config from environment
  const monitoringConfig = {
    enabled: process.env.NEXT_PUBLIC_MONITORING_ENABLED,
    sampleRate: process.env.NEXT_PUBLIC_MONITORING_SAMPLE_RATE,
    debug: process.env.NEXT_PUBLIC_MONITORING_DEBUG,
    errorTrackingEndpoint: process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT,
    metricsEndpoint: process.env.NEXT_PUBLIC_METRICS_ENDPOINT
  };

  try {
    // Validate Firebase config (required)
    const validatedFirebase = firebaseConfigSchema.parse(firebaseConfig);

    // Validate Claude config (optional, warn if missing)
    let validatedClaude;
    try {
      validatedClaude = claudeConfigSchema.parse(claudeConfig);
      if (!claudeConfig.apiKey) {
        warnings.push("Claude API key not configured - AI task breakdown features will be disabled");
      }
    } catch (error) {
      validatedClaude = { apiKey: undefined, model: "claude-3-haiku-20240307" };
      warnings.push("Claude configuration invalid - AI features will be disabled");
    }

    // Validate monitoring config (optional)
    let validatedMonitoring;
    try {
      validatedMonitoring = monitoringConfigSchema.parse(monitoringConfig);
      if (!monitoringConfig.errorTrackingEndpoint && !monitoringConfig.metricsEndpoint) {
        warnings.push("No monitoring endpoints configured - error tracking and metrics will be disabled");
      }
    } catch (error) {
      validatedMonitoring = { enabled: false, sampleRate: 1.0, debug: false };
      warnings.push("Monitoring configuration invalid - monitoring features will be disabled");
    }

    return {
      success: true,
      data: {
        firebase: validatedFirebase,
        claude: validatedClaude,
        monitoring: validatedMonitoring
      },
      warnings
    };

  } catch (error) {
    const errors: string[] = [];

    if (error instanceof z.ZodError) {
      // Extract specific Firebase validation errors
      error.errors.forEach(err => {
        const path = err.path.join('.');
        switch (path) {
          case 'apiKey':
            errors.push("NEXT_PUBLIC_FIREBASE_API_KEY is required and cannot be empty");
            break;
          case 'authDomain':
            errors.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN must be a valid Firebase domain (*.firebaseapp.com)");
            break;
          case 'projectId':
            errors.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID is required and cannot be empty");
            break;
          case 'storageBucket':
            errors.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET must be a valid Firebase bucket (*.appspot.com)");
            break;
          case 'messagingSenderId':
            errors.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is required and cannot be empty");
            break;
          case 'appId':
            errors.push("NEXT_PUBLIC_FIREBASE_APP_ID must be a valid Firebase web app ID (1:*:web:*)");
            break;
          default:
            errors.push(`${path}: ${err.message}`);
        }
      });
    } else {
      errors.push("Unknown validation error occurred");
    }

    return {
      success: false,
      errors,
      warnings
    };
  }
}

/**
 * Get user-friendly setup instructions based on validation errors
 */
export function getSetupInstructions(result: ValidationResult): string[] {
  if (result.success) return [];

  const instructions = [
    "🔥 Pomofly requires Firebase configuration to function properly.",
    "",
    "Please follow these steps:",
    "",
    "1. Go to the Firebase Console: https://console.firebase.google.com",
    "2. Create a new project or select an existing one",
    "3. Go to Project Settings > General > Your apps",
    "4. Click 'Add app' and select 'Web' if you haven't already",
    "5. Copy the configuration values to your .env.local file:",
    "",
    "NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id",
    "NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id",
    "",
    "6. Restart the development server",
    "",
    "Missing or invalid configuration detected:",
  ];

  // Add specific error details
  result.errors.forEach(error => {
    instructions.push(`❌ ${error}`);
  });

  if (result.warnings.length > 0) {
    instructions.push("");
    instructions.push("Optional features not configured:");
    result.warnings.forEach(warning => {
      instructions.push(`⚠️ ${warning}`);
    });
  }

  return instructions;
}

/**
 * Create a graceful degradation plan based on what's available
 */
export function createDegradationPlan(result: ValidationResult): {
  firebaseAvailable: boolean;
  claudeAvailable: boolean;
  monitoringAvailable: boolean;
  supportedFeatures: string[];
  disabledFeatures: string[];
} {
  const plan = {
    firebaseAvailable: result.success,
    claudeAvailable: false,
    monitoringAvailable: false,
    supportedFeatures: [] as string[],
    disabledFeatures: [] as string[]
  };

  if (result.success) {
    plan.supportedFeatures.push("User authentication", "Task management", "Timer sessions", "Data persistence");
    
    if (result.data.claude.apiKey) {
      plan.claudeAvailable = true;
      plan.supportedFeatures.push("AI task breakdown", "Smart task suggestions");
    } else {
      plan.disabledFeatures.push("AI-powered features");
    }

    if (result.data.monitoring.enabled && (result.data.monitoring.errorTrackingEndpoint || result.data.monitoring.metricsEndpoint)) {
      plan.monitoringAvailable = true;
      plan.supportedFeatures.push("Error tracking", "Performance monitoring");
    } else {
      plan.disabledFeatures.push("Monitoring and analytics");
    }
  } else {
    plan.disabledFeatures.push("All Firebase features", "User authentication", "Task management", "Timer sessions", "Data persistence");
  }

  return plan;
}