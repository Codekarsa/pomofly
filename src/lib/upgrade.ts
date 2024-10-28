import { auth } from './firebase';

interface PriceIds {
  monthly: string;
  yearly: string;
}

const priceIds: Record<string, PriceIds> = {
  stripe: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
    yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!
  },
  lemonSqueezy: {
    monthly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_MONTHLY_VARIANT_ID!,
    yearly: process.env.NEXT_PUBLIC_LEMON_SQUEEZY_YEARLY_VARIANT_ID!
  },
  xendit: {
    monthly: '2.99',
    yearly: '29.99'
  }
};

export async function initiateUpgrade(isYearly: boolean): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const gateway = process.env.NEXT_PUBLIC_ACTIVE_PAYMENT_GATEWAY?.toLowerCase() || 'stripe';
  const priceId = isYearly ? priceIds[gateway].yearly : priceIds[gateway].monthly;

  if (!priceId) {
    throw new Error(`Price ID not configured for ${gateway} ${isYearly ? 'yearly' : 'monthly'} plan`);
  }

  try {
    const response = await fetch('/api/upgrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.uid,
        priceId,
        isYearly,
        userEmail: user.email
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initiate upgrade');
    }

    const { url } = await response.json();
    if (!url) {
      throw new Error('No checkout URL received');
    }

    window.location.href = url;
  } catch (error) {
    console.error('Upgrade initiation failed:', error);
    throw error;
  }
}
