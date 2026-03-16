'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Extend window to include gtag and dataLayer
declare global {
  interface Window {
    gtag: (...args: [string, ...unknown[]]) => void;
    dataLayer: unknown[];
  }
}

export default function GoogleAnalytics({ GA_MEASUREMENT_ID }: { GA_MEASUREMENT_ID: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scriptLoaded = useRef(false);

  // Initialize GA4 tracking on mount
  useEffect(() => {
    if (!GA_MEASUREMENT_ID || scriptLoaded.current) return;

    // Create and load gtag script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    script.onload = () => {
      // Initialize gtag function
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag(...args: [string, ...unknown[]]) {
        window.dataLayer.push(args);
      };
      
      // Configure GA4
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: pathname + (searchParams.toString() ? '?' + searchParams.toString() : ''),
      });
      
      scriptLoaded.current = true;
    };

    script.onerror = () => {
      console.warn('Failed to load Google Analytics script');
    };

    document.head.appendChild(script);

    // Safe cleanup - only remove if script exists
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [GA_MEASUREMENT_ID]);

  // Track page views on route changes
  useEffect(() => {
    if (!scriptLoaded.current || !window.gtag) return;

    const url = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
    
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }, [pathname, searchParams, GA_MEASUREMENT_ID]);

  // No component rendering needed for GA4
  return null;
}