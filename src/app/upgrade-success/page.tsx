'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';

export default function UpgradeSuccess() {
  const router = useRouter();
  const { updateSubscription } = useSubscription();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSuccessfulUpgrade = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      try {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        await updateSubscription(user.uid, {
          type: 'premium',
          aiBreakdownsUsed: 0,
          expiresAt: oneYearFromNow,
        });

        // Redirect to the main page after a short delay
        setTimeout(() => router.push('/'), 3000);
      } catch (error) {
        console.error('Failed to update subscription:', error);
        setError('Failed to update subscription. Please contact support.');
      }
    };

    handleSuccessfulUpgrade();
  }, [router, updateSubscription]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-4">
        {error ? 'Upgrade Error' : 'Upgrade Successful!'}
      </h1>
      <p className="text-xl mb-8">
        {error ? error : 'Thank you for upgrading to Premium.'}
      </p>
      <p>You will be redirected shortly...</p>
    </div>
  );
}
