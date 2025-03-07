'use client';

import { ReactNode, useEffect, useRef } from 'react';

interface NestedStickyProps {
  children: ReactNode;
  offsetTop: number;
  offsetBottom: number;
  zIndex?: number;
}

/**
 * `position: sticky` doesn't work in nested divs with overflow-x-hidden,
 * and restructuring the app to put pricing table header on top level would
 * require tricky state management, so we have this for the cases where we
 * need position: sticky, but can't use it directly.
 */
export function NestedSticky({
  children,
  offsetTop,
  offsetBottom,
  zIndex = 10,
}: NestedStickyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const sticky = stickyRef.current;
    const placeholder = placeholderRef.current;

    if (!container || !sticky || !placeholder) return;

    // Store parent element reference
    const parent = container.parentElement;
    if (!parent) return;

    // Initial measurement
    let width = 0;
    let height = 0;
    let isSticky = false;
    let reachedBottom = false;

    // Measure element dimensions
    const measureDimensions = () => {
      if (!sticky) return;

      const rect = sticky.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      // Apply initial styles
      sticky.style.width = '100%';
      sticky.style.zIndex = String(zIndex);
    };

    // Update sticky state
    const updateStickyState = (entries: IntersectionObserverEntry[]) => {
      if (!sticky || !parent || !placeholder) return;

      const entry = entries[0];
      const containerRect = container.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();

      // Check if we should be sticky
      const shouldBeSticky = containerRect.top <= offsetTop;

      if (shouldBeSticky !== isSticky) {
        isSticky = shouldBeSticky;

        // Update placeholder height
        placeholder.style.height = isSticky ? `${height}px` : '0';

        // Update sticky element position
        if (isSticky) {
          sticky.style.position = 'fixed';
          sticky.style.top = `${offsetTop}px`;
          sticky.style.width = `${width}px`;
          sticky.setAttribute('data-fixed', '');
        } else {
          sticky.style.position = 'relative';
          sticky.style.top = '';
          sticky.style.width = '100%';
          sticky.style.transform = '';
          sticky.removeAttribute('data-fixed');
        }
      }

      // Check if we've reached the bottom boundary
      if (isSticky) {
        // Calculate the bottom boundary position, accounting for offsetBottom
        const bottomBoundary = parentRect.bottom - offsetBottom - height;
        const hasReachedBottom = offsetTop >= bottomBoundary;

        if (hasReachedBottom !== reachedBottom) {
          reachedBottom = hasReachedBottom;

          if (reachedBottom) {
            sticky.style.position = 'relative';
            sticky.style.transform = `translateY(${parentRect.bottom - offsetBottom - height - containerRect.top}px)`;
            sticky.removeAttribute('data-fixed');
          } else {
            sticky.style.position = 'fixed';
            sticky.style.transform = '';
            sticky.setAttribute('data-fixed', '');
          }
        }
      }
    };

    // Handle resize events
    const handleResize = () => {
      measureDimensions();
    };

    // Initial setup
    measureDimensions();

    // Create intersection observer
    observerRef.current = new IntersectionObserver(updateStickyState, {
      threshold: [0, 0.1, 0.5, 1],
      rootMargin: `${-offsetTop}px 0px 0px 0px`,
    });

    observerRef.current.observe(container);

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      window.removeEventListener('resize', handleResize);
    };
  }, [offsetTop, offsetBottom, zIndex]);

  return (
    <div ref={containerRef} className="relative">
      <div ref={placeholderRef} style={{ width: '100%', height: 0 }} />
      <div ref={stickyRef}>{children}</div>
    </div>
  );
}
