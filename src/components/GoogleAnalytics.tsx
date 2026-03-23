'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: [string, ...unknown[]]) => void;
  }
}

export default function GoogleAnalytics({
  GA_MEASUREMENT_ID,
}: {
  GA_MEASUREMENT_ID: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scriptLoadedRef = useRef(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Initialize Google Analytics script only once
  useEffect(() => {
<<<<<<< HEAD
    if (scriptLoadedRef.current || !GA_MEASUREMENT_ID) return;

=======
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      // Initialize gtag function
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag(...args: [string, ...unknown[]]) {
        window.dataLayer.push(args);
      };
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID);
    };
    
    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      // Only remove script on component unmount, not on every path change
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      scriptLoadedRef.current = false;
    };
  }, [GA_MEASUREMENT_ID]);

  // Track page views on pathname/search changes (after script loads)
  useEffect(() => {
    if (!scriptLoadedRef.current || !window.gtag) return;
    
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''),
    });
  }, [pathname, searchParams, GA_MEASUREMENT_ID]);

<<<<<<< HEAD
  return null; // Remove GTM component to avoid conflicts
}
=======
  return <GoogleTagManager gtmId={GA_MEASUREMENT_ID} />;
}
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
