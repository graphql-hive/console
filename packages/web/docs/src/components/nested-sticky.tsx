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
  const topObserverRef = useRef<IntersectionObserver | null>(null);
  const bottomObserverRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const sticky = stickyRef.current;

    if (!container || !sticky) return;

    const parent = container.parentElement;
    if (!parent) return;

    // Get the placeholder element (first child of container)
    const placeholder = container.firstElementChild as HTMLElement;
    if (!placeholder) return;

    let width = 0;
    let height = 0;
    let isSticky = false;
    let reachedBottom = false;

    const measureDimensions = () => {
      if (!sticky) return;

      const rect = sticky.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      // Apply initial styles
      sticky.style.width = '100%';
      sticky.style.zIndex = String(zIndex);
    };

    const updateStickyState = () => {
      // Update placeholder height
      placeholder.style.height = isSticky ? `${height}px` : '0';

      // Update sticky element position
      if (isSticky && !reachedBottom) {
        sticky.style.position = 'fixed';
        sticky.style.top = `${offsetTop}px`;
        sticky.style.width = `${width}px`;
        sticky.setAttribute('data-fixed', '');
      } else if (reachedBottom) {
        // When we've reached the bottom boundary
        const containerRect = container.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const distanceToBottom = parentRect.bottom - offsetBottom - containerRect.top - height;

        sticky.style.position = 'relative';
        sticky.style.transform = `translateY(${distanceToBottom}px)`;
        sticky.removeAttribute('data-fixed');
      } else {
        // Normal position
        sticky.style.position = 'relative';
        sticky.style.top = '';
        sticky.style.width = '100%';
        sticky.style.transform = '';
        sticky.removeAttribute('data-fixed');
      }
    };

    // Handle top intersection
    const handleTopIntersection = (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];

      // We become sticky when the top of the container crosses the top of the viewport + offsetTop
      isSticky = !entry.isIntersecting;
      updateStickyState();
    };

    // Handle bottom intersection
    const handleBottomIntersection = (entries: IntersectionObserverEntry[]) => {
      if (!isSticky) return;

      const entry = entries[0];

      // We've reached the bottom when the bottom of the parent is about to exit the viewport
      reachedBottom = !entry.isIntersecting;
      updateStickyState();
    };

    const handleScroll = () => {
      // This is a fallback for browsers that might have issues with Intersection Observer
      const containerRect = container.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();

      const newIsSticky = containerRect.top <= offsetTop;
      const newReachedBottom = parentRect.bottom <= window.innerHeight - offsetBottom;

      if (newIsSticky !== isSticky || newReachedBottom !== reachedBottom) {
        isSticky = newIsSticky;
        reachedBottom = newReachedBottom;
        updateStickyState();
      }
    };

    const handleResize = () => {
      measureDimensions();
      updateStickyState();
    };

    // Setup observers
    const setupObservers = () => {
      // Top observer to detect when we should become sticky
      topObserverRef.current = new IntersectionObserver(handleTopIntersection, {
        threshold: 0,
        rootMargin: `${-offsetTop}px 0px 0px 0px`,
      });

      // Bottom observer to detect when we reach the bottom boundary
      bottomObserverRef.current = new IntersectionObserver(handleBottomIntersection, {
        threshold: 0,
        rootMargin: `0px 0px ${-offsetBottom}px 0px`,
      });

      topObserverRef.current.observe(container);
      bottomObserverRef.current.observe(parent);
    };

    // Initial setup
    measureDimensions();
    setupObservers();

    // Add event listeners
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (topObserverRef.current) {
        topObserverRef.current.disconnect();
      }

      if (bottomObserverRef.current) {
        bottomObserverRef.current.disconnect();
      }

      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [offsetTop, offsetBottom, zIndex]);

  return (
    <div ref={containerRef} className="relative">
      <div style={{ width: '100%', height: 0 }} />
      <div ref={stickyRef}>{children}</div>
    </div>
  );
}
