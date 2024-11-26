/* eslint-disable @typescript-eslint/no-unused-vars */
import Stripe from 'stripe';
import LemonSqueezy from '@lemonsqueezy/lemonsqueezy.js';
import Xendit from 'xendit-node';
import { getLemonSqueezy } from '@/lib/lemonsqueezy';


export interface PaymentGatewayResponse {
  sessionId: string;
  url: string;
}

export interface PaymentGatewayRequest {
  userId: string;
  priceId: string;
  isYearly: boolean;
  userEmail?: string;
}

export interface PaymentGateway {
  createCheckoutSession: (request: PaymentGatewayRequest) => Promise<PaymentGatewayResponse>;
}

class StripeGateway implements PaymentGateway {
  //   private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    // this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  }

  async createCheckoutSession(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    // const session = await this.stripe.checkout.sessions.create({
    //   payment_method_types: ['card'],
    //   line_items: [{ price: request.priceId, quantity: 1 }],
    //   mode: 'subscription',
    //   success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/upgrade-cancelled`,
    //   client_reference_id: request.userId,
    //   customer_email: request.userEmail,
    //   metadata: {
    //     userId: request.userId,
    //     planType: request.isYearly ? 'yearly' : 'monthly'
    //   }
    // });

    return { 
      //   sessionId: session.id, 
      //   url: session.url || '' 
        sessionId: '', 
        url: '' 
    };
  }
}

class LemonSqueezyGateway implements PaymentGateway {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private lemonSqueezy: any;

  constructor() {
    if (!process.env.LEMON_SQUEEZY_API_KEY || !process.env.LEMON_SQUEEZY_STORE_ID) {
      throw new Error('LemonSqueezy configuration is incomplete');
    }
    this.lemonSqueezy = getLemonSqueezy();
  }

  async createCheckoutSession(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    try {
      const checkout = await this.lemonSqueezy.createCheckout({
        store: process.env.LEMON_SQUEEZY_STORE_ID!,
        variant: request.priceId,
        custom: { 
          user_id: request.userId,
          plan_type: request.isYearly ? 'yearly' : 'monthly'
        },
        checkout_data: {
          email: request.userEmail
        },
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/upgrade-success`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/upgrade-cancelled`,
        product_options: {
          enabled_variants: [request.priceId],
          redirect_url: `${process.env.NEXT_PUBLIC_BASE_URL}/upgrade-success`
        }
      });

      return {
        sessionId: checkout.data.id,
        url: checkout.data.attributes.url
      };
    } catch (error) {
      console.error('Error creating LemonSqueezy checkout session:', error);
      throw new Error('Failed to create checkout session with LemonSqueezy.');
    }
  }
}

class XenditGateway implements PaymentGateway {
  private xendit: Xendit;

  constructor() {
    if (!process.env.XENDIT_SECRET_KEY) {
      throw new Error('XENDIT_SECRET_KEY is not configured');
    }
    this.xendit = new Xendit({ secretKey: process.env.XENDIT_SECRET_KEY });
  }

  async createCheckoutSession(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    const { Invoice } = this.xendit;
    // const i = new Invoice({});

    const amount = parseFloat(request.priceId);
    // const invoice = await i.createInvoice({
    //   externalID: `upgrade-${request.userId}-${Date.now()}`,
    //   amount,
    //   payerEmail: request.userEmail,
    //   description: `Pomofly Premium Subscription - ${request.isYearly ? 'Yearly' : 'Monthly'}`,
    //   successRedirectURL: `${process.env.NEXT_PUBLIC_BASE_URL}/upgrade-success`,
    //   failureRedirectURL: `${process.env.NEXT_PUBLIC_BASE_URL}/upgrade-cancelled`,
    //   metadata: {
    //     userId: request.userId,
    //     planType: request.isYearly ? 'yearly' : 'monthly'
    //   }
    // });

    return {
      //   sessionId: invoice.id,
      //   url: invoice.invoice_url
      sessionId: '', 
      url: '' 
    };
  }
}

const gatewayMap: Record<string, new () => PaymentGateway> = {
  stripe: StripeGateway,
  lemonSqueezy: LemonSqueezyGateway,
  xendit: XenditGateway,
};

export function getPaymentGateway(): PaymentGateway {
  const gatewayName = process.env.NEXT_PUBLIC_ACTIVE_PAYMENT_GATEWAY?.toLowerCase() || 'stripe';
  const GatewayClass = gatewayMap[gatewayName];

  if (!GatewayClass) {
    throw new Error(`Invalid payment gateway: ${gatewayName}`);
  }

  return new GatewayClass();
}
