// @vitest-environment jsdom
import { Provider as UrqlProvider } from 'urql';
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { createTestClient } from '@/lib/testing/urql';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { useLayoutQuery } from './use-layout-query';

// The app's route ids without its pages, as in use-slugs.spec.tsx.
function routerAt(url: string, leaf: () => React.ReactNode, onError?: () => React.ReactNode) {
  const root = createRootRoute();
  const authenticated = createRoute({
    getParentRoute: () => root,
    id: 'authenticated',
    component: Outlet,
  });
  const withHeader = createRoute({
    getParentRoute: () => authenticated,
    id: 'with-header',
    component: Outlet,
  });
  const organization = createRoute({
    getParentRoute: () => withHeader,
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
        withHeader.addChildren([
          organization.addChildren([organizationIndex, project.addChildren([target])]),
        ]),
      ]),
    ]),
    history: createMemoryHistory({ initialEntries: [url] }),
    defaultErrorComponent: onError,
  });
}

type Scope = 'organization' | 'project' | 'target';

function Layout(props: { scope: Scope }) {
  const query = useLayoutQuery(props.scope);
  return <pre>{JSON.stringify(query.data ?? null)}</pre>;
}

function renderAt(url: string, leaf: () => React.ReactNode, onError?: () => React.ReactNode) {
  const client = createTestClient(layoutFixtures());
  const router = routerAt(url, leaf, onError);
  render(
    <UrqlProvider value={client}>
      <RouterProvider router={router as never} />
    </UrqlProvider>,
  );
  return client;
}

const TARGET = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}`;

describe('useLayoutQuery', () => {
  it('returns the layout document of the scope asked for', async () => {
    renderAt(TARGET, () => <Layout scope="target" />);
    const data = JSON.parse((await screen.findByText(/{/)).textContent!);
    expect(data.organization.project.target.slug).toBe(SLUGS.targetSlug);
    expect(data.organization.usageRetentionInDays).toBe(30);
  });

  it('is one request however many components read it', async () => {
    const client = renderAt(TARGET, () => (
      <>
        <Layout scope="target" />
        <Layout scope="target" />
      </>
    ));
    expect(await screen.findAllByText(/{/)).toHaveLength(2);
    expect(client.seen).toEqual(['TargetLayoutQuery']);
  });

  it('errors above its route when asked for a scope the page is not under', async () => {
    renderAt(
      `/${SLUGS.organizationSlug}`,
      () => <Layout scope="target" />,
      () => <p>error boundary</p>,
    );
    expect(await screen.findByText('error boundary')).toBeTruthy();
    expect(document.querySelector('pre')).toBeNull();
  });
});
