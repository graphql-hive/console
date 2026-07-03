import { useEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router';

// Manually handle scroll restoration since tanstack's component doesn't work correctly with the target explorer page
export function useScrollRestoration(isReady: boolean) {
  const location = useLocation();
  const hasRestored = useRef(false);
  const cacheKey = `__hive_${location.pathname}`;

  useEffect(() => {
    hasRestored.current = false;

    return () => {
      // on unmount, capture the position
      try {
        sessionStorage.setItem(cacheKey, window.scrollY.toString());
      } catch {}
    };
  }, [cacheKey]);

  useEffect(() => {
    if (isReady && !hasRestored.current) {
      hasRestored.current = true;
      const timer = setTimeout(() => {
        const savedScroll = sessionStorage?.getItem(cacheKey) ?? null;

        if (savedScroll !== null) {
          window.scrollTo({
            top: parseInt(savedScroll, 10),
            left: 0,
            behavior: 'instant',
          });
        } else {
          window.scrollTo(0, 0);
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [isReady, cacheKey]);
}
