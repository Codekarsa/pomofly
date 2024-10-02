'use client';

export const useGoogleAnalytics = () => {
  const event = (action: string, params: object) => {
    window.gtag = window.gtag || (() => {}); // Ensure gtag is defined
    window.gtag('event', action, params);
  };

  return { event };
};