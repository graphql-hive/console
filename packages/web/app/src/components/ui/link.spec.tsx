// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { Link } from './link';

function renderInRouter(element: React.ReactNode) {
  const root = createRootRoute({ component: () => <>{element}</> });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router as never} />);
}

describe('Link', () => {
  // The router's Link re-resolves a bare href as an internal location, which would send a docs
  // link to the app's own origin.
  it('keeps the origin of a link that leaves the app', async () => {
    renderInRouter(
      <Link href="https://the-guild.dev/graphql/hive/docs/x" target="_blank" rel="noreferrer">
        docs
      </Link>,
    );
    expect((await screen.findByText('docs')).getAttribute('href')).toBe(
      'https://the-guild.dev/graphql/hive/docs/x',
    );
  });
});
