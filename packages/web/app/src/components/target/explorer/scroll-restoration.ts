import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';

// Manually handle scroll restoration since tanstack's component doesn't work correctly with the target explorer page
export function useScrollRestoration(isReady: boolean) {
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    const handleScroll = () => {
      const cacheKey = `__hive_${currentPath}`;
      sessionStorage.setItem(cacheKey, window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentPath]);

  useEffect(() => {
    if (isReady) {
      queueMicrotask(() => {
        const cacheKey = `__hive_${currentPath}`;
        const savedScroll = sessionStorage.getItem(cacheKey);

        if (savedScroll !== null) {
          window.scrollTo({
            top: parseInt(savedScroll, 10),
            left: 0,
            behavior: 'instant', // Prevents visual jumping
          });
        } else {
          window.scrollTo(0, 0);
        }
      });
    }
  }, [isReady, currentPath]);
}
