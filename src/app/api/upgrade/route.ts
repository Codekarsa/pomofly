import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { getPaymentGateway } from '@/lib/paymentGateway';
import type { PaymentGatewayRequest } from '@/lib/paymentGateway';

export async function POST(request: Request) {
  try {
    const body = await request.json() as PaymentGatewayRequest;
    const { userId, priceId, isYearly, userEmail } = body;

    // Verify the user is authenticated
    const user = auth.currentUser;
    if (!user || user.uid !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentGateway = getPaymentGateway();
    const { sessionId, url } = await paymentGateway.createCheckoutSession({
      userId,
      priceId,
      isYearly,
      userEmail
    });

    return NextResponse.json({ sessionId, url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
