'use client';

import { useEffect } from 'react';

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
