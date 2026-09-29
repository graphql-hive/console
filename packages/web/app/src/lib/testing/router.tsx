import type { Client } from 'urql';
import { createAppRouter } from '@/router';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';

// ThemeProvider asks the OS for its color scheme; jsdom has no matchMedia.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Charts measure their container; jsdom has no ResizeObserver.
if (typeof window !== 'undefined' && typeof window.ResizeObserver !== 'function') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/**
 * Renders the real app at `url`: the real route tree, root providers and layouts, in a memory
 * history, with `client` (a `createTestClient`) in router context. Pair it with the module mocks a
 * spec needs for jsdom (`@/env/frontend`, the laboratory package, SuperTokens); `vi.mock` has to sit
 * in the spec file itself, so this helper cannot own them.
 */
export function renderAtUrl(url: string, options: { client: Client }) {
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
    urqlClient: options.client,
  });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}
