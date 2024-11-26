import { auth } from './firebase';
import { getPaymentGateway } from './paymentGateway';

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
    monthly: process.env.NEXT_PUBLIC_XENDIT_MONTHLY_PRICE_ID!,
    yearly: process.env.NEXT_PUBLIC_XENDIT_YEARLY_PRICE_ID!
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
    const paymentGateway = getPaymentGateway();
    const response = await paymentGateway.createCheckoutSession({
      userId: user.uid,
      priceId,
      isYearly,
      userEmail: user.email || undefined,
    });

    if (!response.url) {
      throw new Error('No checkout URL received');
    }

    window.location.href = response.url;
  } catch (error) {
    console.error('Upgrade initiation failed:', error);
    throw error;
  }
}
