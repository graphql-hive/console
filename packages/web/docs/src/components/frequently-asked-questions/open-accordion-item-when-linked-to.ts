'use client';

import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
export function OpenAccordionItemWhenLinkedTo() {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useIsomorphicLayoutEffect(() => {
    console.log('hash', hash);
    if (hash) {
      const button = document.querySelector<HTMLButtonElement>(
        `#${hash} button[aria-expanded="false"]`,
      );
      if (button) {
        button.click();
        // in the case where user scrolls up and clicks the same link again,
        // we couldn't rely on hash change, so we just consume it here
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [hash]);

  return null;
}

const subscribe = (onStoreChange: () => void) => {
  const handler = () => {
    onStoreChange();
  };

  window.addEventListener('hashchange', handler);
  return () => void window.removeEventListener('hashchange', handler);
};

const getSnapshot = () => {
  const hash = window.location.hash;
  if (hash.startsWith('#faq')) {
    return hash.slice(1);
  }
  return undefined;
};

const getServerSnapshot = () => {
  return undefined;
};
