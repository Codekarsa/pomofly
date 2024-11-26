'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function UpgradeSuccess() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    toast({
      title: "Success!",
      description: "Your subscription has been activated. Enjoy premium features!",
    });
    
    // Redirect to home page after 3 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-3xl font-bold mb-4">Upgrade Successful!</h1>
      <p className="text-xl mb-8">Thank you for upgrading to Premium.</p>
      <p>You will be redirected shortly...</p>
    </div>
  );
}
