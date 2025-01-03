'use client';

import { useEffect, useLayoutEffect } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Add to pages without dark mode.
 */
export function AddLightClassToBody() {
  useIsomorphicLayoutEffect(() => {
    // We add .light class to body to style the Headless UI
    // portal containing search results.
    document.body.classList.add('light');

    return () => {
      document.body.classList.remove('light');
    };
  }, []);

  return null;
}

const pagesWithFAQ = ['/', '/federation', '/pricing'];

export function isPageWithFaq(path: string) {
  return pagesWithFAQ.includes(path);
}

export function AttachPageFAQSchema() {
  useEffect(() => {
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

  return null;
}
