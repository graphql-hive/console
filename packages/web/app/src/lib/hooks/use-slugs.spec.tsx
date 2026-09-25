// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { useSlugs } from './use-slugs';

/**
 * A stand-in for the app's tree: the same route ids, none of the pages. `useSlugs` looks its route
 * up by id, so this exercises the real lookup without mounting the app.
 */
function routerAt(url: string, leaf: () => React.ReactNode, onError?: () => React.ReactNode) {
  const root = createRootRoute();
  const authenticated = createRoute({
    getParentRoute: () => root,
    id: 'authenticated',
    component: Outlet,
  });
  const organization = createRoute({
    getParentRoute: () => authenticated,
    path: '$organizationSlug',
    component: Outlet,
  });
  const project = createRoute({
    getParentRoute: () => organization,
    path: '$projectSlug',
    component: Outlet,
  });
  const target = createRoute({
    getParentRoute: () => project,
    path: '$targetSlug',
    component: leaf,
  });
  const organizationIndex = createRoute({
    getParentRoute: () => organization,
    path: '/',
    component: leaf,
  });
  return createRouter({
    routeTree: root.addChildren([
      authenticated.addChildren([
        organization.addChildren([organizationIndex, project.addChildren([target])]),
      ]),
    ]),
    history: createMemoryHistory({ initialEntries: [url] }),
    defaultErrorComponent: onError,
  });
}

function Slugs(props: { scope: 'organization' | 'project' | 'target' }) {
  return <pre>{JSON.stringify(useSlugs(props.scope))}</pre>;
}

async function slugsAt(url: string, scope: 'organization' | 'project' | 'target') {
  const router = routerAt(url, () => <Slugs scope={scope} />);
  render(<RouterProvider router={router as never} />);
  return JSON.parse((await screen.findByText(/{/)).textContent!);
}

describe('useSlugs', () => {
  it('reads the whole path of the scope asked for', async () => {
    await expect(slugsAt('/the-guild/gateway/production', 'target')).resolves.toEqual({
      organizationSlug: 'the-guild',
      projectSlug: 'gateway',
      targetSlug: 'production',
    });
  });

  it('gives a target page only what it asked for', async () => {
    await expect(slugsAt('/the-guild/gateway/production', 'organization')).resolves.toEqual({
      organizationSlug: 'the-guild',
    });
  });

  // Asking for a scope the component does not sit under is a bug, so it hits the route's error
  // boundary rather than handing back an empty slug that would query for nothing.
  it('errors above its route instead of returning a blank slug', async () => {
    const router = routerAt(
      '/the-guild',
      () => <Slugs scope="target" />,
      () => <p>error boundary</p>,
    );
    render(<RouterProvider router={router as never} />);
    expect(await screen.findByText('error boundary')).toBeTruthy();
    expect(document.querySelector('pre')).toBeNull();
  });
});
