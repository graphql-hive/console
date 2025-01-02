import { useEffect, useLayoutEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useTheme() {
  useIsomorphicLayoutEffect(() => {
    // We add .light class to body to style the Headless UI
    // portal containing search results.
    document.body.classList.add('light');

    return () => {
      document.body.classList.remove('light');
    };
  }, []);
}

const pagesWithFAQ = ['/', '/federation', '/pricing'];

export function isPageWithFaq(path: string) {
  return pagesWithFAQ.includes(path);
}

export function usePageFAQSchema() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const html = document.querySelector('html');

    if (!html) {
      // This should never happen
      return;
    }

    const path = window.location.pathname.replace('/graphql/hive', '/');

    if (isPageWithFaq(path) && !html.hasAttribute('itemscope')) {
      html.setAttribute('itemscope', '');
      html.setAttribute('itemtype', 'https://schema.org/FAQPage');

      return () => {
        html.removeAttribute('itemscope');
        html.removeAttribute('itemtype');
      };
    }
  }, []);
}
