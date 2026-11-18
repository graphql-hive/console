// @vitest-environment jsdom
import { createElement } from 'react';
import { layoutFixtures, SLUGS } from '@/lib/testing/fixtures/layouts';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { screen, waitFor } from '@testing-library/react';

// The tree imports every page; these stand in for what cannot load under jsdom.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);
vi.mock('@/components/schema-editor', async importOriginal => ({
  ...(await importOriginal<typeof import('@/components/schema-editor')>()),
  SchemaEditor: (props: { value: string }) =>
    createElement('pre', { 'data-testid': 'sdl' }, props.value),
}));
vi.mock('@/lib/auth/session', () => import('@/lib/testing/mocks/auth-session'));

const SCHEMA_PAGE = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}`;

function schemaPage(type: 'FEDERATION' | 'STITCHING') {
  const edges = ['users', 'products'].map(service => ({
    __typename: 'SchemaEdge',
    node: {
      __typename: 'CompositeSchema',
      id: `schema-${service}`,
      source: `type Query { ${service}: String }`,
      service,
      url: `https://${service}.example`,
    },
  }));
  return {
    __typename: 'Query',
    project: {
      __typename: 'Project',
      id: 'project-1',
      type,
      target: {
        __typename: 'Target',
        id: 'target-1',
        slug: SLUGS.targetSlug,
        latestSchemaVersion: {
          __typename: 'SchemaVersion',
          id: 'version-42',
          schemas: { __typename: 'SchemaConnection', edges },
        },
        latestValidSchemaVersion: {
          __typename: 'SchemaVersion',
          id: 'version-42',
          sdl: 'type Query { api: String }',
          supergraph: null,
        },
      },
    },
  };
}

function client(type: 'FEDERATION' | 'STITCHING') {
  return createTestClient(
    new Map([...layoutFixtures(), ['TargetSchemaPageQuery', schemaPage(type)]]),
  );
}

const pressed = (name: string) => screen.queryByRole('button', { name, pressed: true });

describe('target schema page', () => {
  it('lands on the service view from an old ?service= link', { timeout: 30_000 }, async () => {
    renderAtUrl(`${SCHEMA_PAGE}?service=products`, { client: client('FEDERATION') });

    await waitFor(() => expect(screen.getByTestId('sdl').textContent).toContain('products'));
    expect(pressed('Service')).toBeTruthy();
  });

  it('offers no supergraph for a stitching project', { timeout: 30_000 }, async () => {
    renderAtUrl(`${SCHEMA_PAGE}?view=supergraph`, { client: client('STITCHING') });

    await waitFor(() => expect(screen.getByTestId('sdl').textContent).toContain('api'));
    expect(pressed('API schema')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Supergraph' })).toBeNull();
  });
});
