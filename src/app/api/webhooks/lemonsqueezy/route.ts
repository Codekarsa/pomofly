import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headersList = headers();
    const signature = headersList.get('x-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 401 });
    }

    // Verify webhook signature
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!;
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(JSON.stringify(body)).digest('hex');

    if (signature !== digest) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { meta, data } = body;
    const eventName = meta.event_name;

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const { custom_data } = data.attributes;
      const userId = custom_data.user_id;
      const planType = custom_data.plan_type;
      
      // Calculate expiration date
      const expiresAt = new Date();
      if (planType === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // Update user subscription in Firestore
      const subscriptionRef = doc(db, 'subscriptions', userId);
      await setDoc(subscriptionRef, {
        type: 'premium',
        aiBreakdownsUsed: 0,
        aiBreakdownsLimit: Number.POSITIVE_INFINITY,
        expiresAt,
        subscriptionId: data.id,
        status: data.attributes.status,
        updatedAt: new Date()
      }, { merge: true });
    }

    if (eventName === 'subscription_cancelled') {
      const { custom_data } = data.attributes;
      const userId = custom_data.user_id;
      
      // Update user subscription to free tier
      const subscriptionRef = doc(db, 'subscriptions', userId);
      await setDoc(subscriptionRef, {
        type: 'free',
        aiBreakdownsUsed: 0,
        aiBreakdownsLimit: 5,
        status: 'cancelled',
        updatedAt: new Date()
      }, { merge: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

