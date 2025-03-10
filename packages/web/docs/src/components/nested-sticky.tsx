'use client';

import { ReactNode, useEffect, useRef } from 'react';

const BOTTOM_THRESHOLD_ADJUSTMENT = 10;

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
    let rafId: number | null = null;

    // relative at the top
    // fixed when we scroll
    // absolute when we're near the bottom
    type State = 'fixed' | 'absolute' | 'relative';
    let state: State = 'relative';
    let prevState: State = 'relative';

    const measureDimensions = () => {
      const rect = sticky.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      sticky.style.zIndex = String(zIndex);
    };

    const updateStyles = () => {
      placeholder.style.height = state !== 'relative' ? `${height}px` : '0';

      if (state === 'fixed') {
        sticky.style.position = 'fixed';
        sticky.style.top = `${offsetTop}px`;
        sticky.style.width = `${width}px`;
        sticky.setAttribute('data-fixed', '');
      } else if (state === 'absolute') {
        const containerRect = container.getBoundingClientRect();
        const stickyRect = sticky.getBoundingClientRect();

        const relativeTop = stickyRect.top - containerRect.top;

        sticky.style.position = 'absolute';
        sticky.style.top = `${relativeTop}px`;
        sticky.style.width = `${width}px`;
        sticky.setAttribute('data-fixed', '');
      } else {
        sticky.style.position = 'relative';
        sticky.style.top = '';
        sticky.style.width = '';
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

        const shouldBeFixed = containerRect.top < offsetTop;

        const nearBottom =
          parentRect.bottom < offsetTop + height + offsetBottom + BOTTOM_THRESHOLD_ADJUSTMENT;

        state = shouldBeFixed && nearBottom ? 'absolute' : shouldBeFixed ? 'fixed' : 'relative';

        if (state !== prevState) {
          prevState = state;
          updateStyles();
        }
      });
    };

    const handleResize = () => {
      const placeholderRect = placeholder.getBoundingClientRect();

      width = placeholderRect.width;

      updateStyles();
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
