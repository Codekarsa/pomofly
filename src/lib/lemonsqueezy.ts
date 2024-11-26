import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

/**
 * Ensures that required environment variables are set and sets up the Lemon
 * Squeezy JS SDK. Throws an error if any environment variables are missing or
 * if there's an error setting up the SDK.
 */
export function configureLemonSqueezy() {
  const requiredVars = [
    'LEMON_SQUEEZY_API_KEY',
    'LEMON_SQUEEZY_STORE_ID',
    'LEMON_SQUEEZY_WEBHOOK_SECRET',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required LEMONSQUEEZY env variables: ${missingVars.join(
        ', '
      )}. Please, set them in your .env file.`
    );
  }

  const lemonSqueezy = lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY! });
  return lemonSqueezy;
}

// Singleton instance
let lemonSqueezyInstance: ReturnType<typeof configureLemonSqueezy> | null = null;

export function getLemonSqueezy(): ReturnType<typeof configureLemonSqueezy> {
  if (!lemonSqueezyInstance) {
    lemonSqueezyInstance = configureLemonSqueezy();
  }
  return lemonSqueezyInstance;
}
