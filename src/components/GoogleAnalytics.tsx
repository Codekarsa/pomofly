'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { GoogleTagManager } from '@next/third-parties/google';

export default function GoogleAnalytics({ GA_MEASUREMENT_ID }: { GA_MEASUREMENT_ID: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Load the Google Analytics script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    function gtag(...args: [string, ...unknown[]]) {
      window.dataLayer = window.dataLayer || []; // Ensure dataLayer is defined
      window.dataLayer.push(args);
    }
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      page_path: pathname + searchParams.toString(),
    });

    // Cleanup script on component unmount
    return () => {
      document.head.removeChild(script);
    };
  }, [pathname, searchParams, GA_MEASUREMENT_ID]);

  return <GoogleTagManager gtmId={GA_MEASUREMENT_ID} />;
}