'use client';

export const useGoogleAnalytics = () => {
  const event = (action: string, params: object) => {
    window.gtag = window.gtag || (() => {});
    window.gtag('event', action, params);
  };

  return { event };
};