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
 * history. Pair it with the module mocks a spec needs for jsdom (`@/env/frontend`, the laboratory
 * package, SuperTokens, and `@/lib/urql` pointed at a `createTestClient`); `vi.mock` has to sit in
 * the spec file itself, so this helper cannot own them.
 */
export function renderAtUrl(url: string) {
  const router = createAppRouter({ history: createMemoryHistory({ initialEntries: [url] }) });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}
