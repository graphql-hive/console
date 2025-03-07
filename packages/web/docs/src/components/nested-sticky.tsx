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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const placeholder = container.firstElementChild as HTMLElement;
    const sticky = container.lastElementChild as HTMLElement;
    const parent = container.parentElement;

    if (!placeholder || !sticky || !parent) return;

    let width = 0;
    let height = 0;
    let isSticky = false;
    let rafId: number | null = null;

    const measureDimensions = () => {
      const rect = sticky.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      sticky.style.width = '100%';
      sticky.style.zIndex = String(zIndex);
    };

    const updateStyles = () => {
      placeholder.style.height = isSticky ? `${height}px` : '0';

      if (isSticky) {
        sticky.style.position = 'fixed';
        sticky.style.top = `${offsetTop}px`;
        sticky.style.width = `${width}px`;
        sticky.setAttribute('data-fixed', '');
      } else {
        sticky.style.position = 'relative';
        sticky.style.top = '';
        sticky.style.width = '100%';
        sticky.removeAttribute('data-fixed');
      }
    };

    const handleScroll = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();

        // Simple sticky logic: stick when container top crosses the offset
        const shouldBeSticky = containerRect.top < offsetTop;

        // Stop being sticky when we reach the bottom of the parent
        // We add a buffer to prevent jittering
        if (shouldBeSticky && parentRect.bottom < offsetTop + height + offsetBottom + 10) {
          isSticky = false;
        } else {
          isSticky = shouldBeSticky;
        }

        updateStyles();
      });
    };

    const handleResize = () => {
      measureDimensions();
      handleScroll();
    };

    measureDimensions();
    handleScroll();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [offsetTop, offsetBottom, zIndex]);

  return (
    <div ref={containerRef} className="relative">
      <div style={{ width: '100%', height: 0 }} />
      <div>{children}</div>
    </div>
  );
}
