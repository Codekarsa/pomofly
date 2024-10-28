'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UpgradeCancelled() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push('/pricing'), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-4">Upgrade Cancelled</h1>
      <p className="text-xl mb-8">Your upgrade process was cancelled.</p>
      <p>You will be redirected to the pricing page shortly...</p>
    </div>
  );
}

