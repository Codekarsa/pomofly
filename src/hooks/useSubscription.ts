import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface Subscription {
  type: 'free' | 'premium';
  aiBreakdownsUsed: number;
  aiBreakdownsLimit: number;
  expiresAt?: Date;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'subscriptions', user.uid),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as Subscription;
          // Check if the premium subscription has expired
          if (data.type === 'premium' && data.expiresAt && data.expiresAt < new Date()) {
            setSubscription({
              type: 'free',
              aiBreakdownsUsed: 0,
              aiBreakdownsLimit: 5
            });
          } else {
            setSubscription(data);
          }
        } else {
          // Set default free subscription if not found
          setSubscription({
            type: 'free',
            aiBreakdownsUsed: 0,
            aiBreakdownsLimit: 5
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching subscription:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const incrementAIBreakdownUsage = async () => {
    if (!subscription) return;

    const user = auth.currentUser;
    if (!user) return;

    const newUsage = subscription.aiBreakdownsUsed + 1;
    await updateSubscription(user.uid, { aiBreakdownsUsed: newUsage });
  };

  const updateSubscription = async (userId: string, data: Partial<Subscription>) => {
    const subscriptionRef = doc(db, 'subscriptions', userId);
    await setDoc(subscriptionRef, data, { merge: true });
  };

  const isPremium = () => subscription?.type === 'premium';

  return { subscription, loading, incrementAIBreakdownUsage, updateSubscription, isPremium };
}
