'use client';

import { ReactElement, ReactNode, useEffect, useRef, useState } from 'react';

interface HideUntilInViewportProps {
  /** Fires when IntersectionObserver enters viewport */
  onEnter?: (id?: string) => void;
  fallback?: ReactNode;
  children: ReactNode;
}

export const HideUntilInViewport = ({
  children,
  fallback = null,
  onEnter,
}: HideUntilInViewportProps): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  const [isChildVisible, setIsChildVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsChildVisible(true);
          onEnter?.();
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 1,
      },
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
  }, [ref, onEnter]);

  return <div ref={ref}>{isChildVisible ? children : fallback}</div>;
};
