import { useEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router';

const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  },
};

// Manually handle scroll restoration since tanstack's component doesn't work correctly with the target explorer page
export function useScrollRestoration(isReady: boolean) {
  const location = useLocation();
  const currentPath = location.pathname;
  const hasRestored = useRef(false);

  useEffect(() => {
    hasRestored.current = false;
  }, [currentPath]);

  useEffect(() => {
    let timeoutId: number;
    const handleScroll = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const cacheKey = `__hive_${currentPath}`;
        safeSessionStorage.setItem(cacheKey, window.scrollY.toString());
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.clearTimeout(timeoutId);
      const cacheKey = `__hive_${currentPath}`;
      safeSessionStorage.setItem(cacheKey, window.scrollY.toString());
    };
  }, [currentPath]);

  useEffect(() => {
    if (isReady && !hasRestored.current) {
      hasRestored.current = true;
      const timer = setTimeout(() => {
        const cacheKey = `__hive_${currentPath}`;
        const savedScroll = safeSessionStorage.getItem(cacheKey);

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
  }, [isReady, currentPath]);
}
