import Anthropic from '@anthropic-ai/sdk';

// Supported Claude models with their characteristics
export const CLAUDE_MODELS = {
  // Claude 3.5 Sonnet - Best balance of performance and cost
  'claude-3-5-sonnet-20241022': {
    name: 'Claude 3.5 Sonnet',
    maxTokens: 8192,
    contextWindow: 200000,
    costPer1kTokens: { input: 0.003, output: 0.015 },
    description: 'Most capable model for complex reasoning and coding'
  },
  // Claude 3 Haiku - Fast and cost-effective  
  'claude-3-haiku-20240307': {
    name: 'Claude 3 Haiku',
    maxTokens: 4096,
    contextWindow: 200000,
    costPer1kTokens: { input: 0.00025, output: 0.00125 },
    description: 'Fastest and most cost-effective for simple tasks'
  },
  // Claude 3 Sonnet - Good middle ground
  'claude-3-sonnet-20240229': {
    name: 'Claude 3 Sonnet',
    maxTokens: 4096,
    contextWindow: 200000,
    costPer1kTokens: { input: 0.003, output: 0.015 },
    description: 'Balanced performance and cost'
  }
} as const;

export type ClaudeModelId = keyof typeof CLAUDE_MODELS;

// Default model for task breakdown (fast and cost-effective)
export const DEFAULT_CLAUDE_MODEL: ClaudeModelId = 'claude-3-haiku-20240307';

// Alternative models for different use cases
export const ALTERNATIVE_MODELS: ClaudeModelId[] = [
  'claude-3-sonnet-20240229',
  'claude-3-5-sonnet-20241022'
];

/**
 * Validates and returns a valid Claude model ID
 */
export function validateClaudeModel(model?: string): ClaudeModelId {
  if (!model) {
    return DEFAULT_CLAUDE_MODEL;
  }

  // Check if the provided model is in our supported list
  if (model in CLAUDE_MODELS) {
    return model as ClaudeModelId;
  }

  // If model is not supported, log a warning and return default
  console.warn(`Unsupported Claude model: ${model}. Using default: ${DEFAULT_CLAUDE_MODEL}`);
  return DEFAULT_CLAUDE_MODEL;
}

/**
 * Gets the appropriate max_tokens for a given model
 */
export function getMaxTokensForModel(modelId: ClaudeModelId): number {
  return CLAUDE_MODELS[modelId].maxTokens;
}

/**
 * Creates a configured Anthropic client instance
 */
export function createClaudeClient(): Anthropic | null {
  const apiKey = process.env.CLAUDE_API_KEY;
  
  if (!apiKey) {
    console.error('CLAUDE_API_KEY environment variable is not set');
    return null;
  }

  try {
    return new Anthropic({
      apiKey: apiKey,
      // Add additional configuration as needed
      maxRetries: 3,
      timeout: 60000, // 60 seconds
    });
  } catch (error) {
    console.error('Failed to initialize Claude client:', error);
    return null;
  }
}

/**
 * Gets Claude configuration from environment with validation
 */
export function getClaudeConfig() {
  const model = validateClaudeModel(process.env.CLAUDE_MODEL);
  const client = createClaudeClient();
  
  return {
    client,
    model,
    modelInfo: CLAUDE_MODELS[model],
    maxTokens: getMaxTokensForModel(model),
    isConfigured: !!client
  };
}