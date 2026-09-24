// @vitest-environment jsdom
import type * as Urql from 'urql';
import { ToastProvider } from '@/components/base/toast/toast';
import { NativeFederationCompatibilityStatusType } from '@/gql/graphql';
import { fireEvent, render, screen } from '@testing-library/react';
import { NativeCompositionDiff } from './native-composition-diff';

const urql = vi.hoisted(() => ({
  query: { data: undefined as unknown, fetching: false, error: undefined as unknown },
}));

vi.mock('urql', async importOriginal => ({
  ...(await importOriginal<typeof Urql>()),
  useQuery: () => [urql.query, vi.fn()],
}));

// The diff editor is Monaco; both targets below compose identically, so the text branch renders.
vi.mock('@/components/v2', () => ({ DiffEditor: () => null }));
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));

function result(slug: string, services: number) {
  return {
    target: { id: `target-${slug}`, slug },
    currentSupergraphSdl: 'type Query { ok: Boolean }',
    nativeCompositionResult: {
      duration: 1,
      supergraphSdl: 'type Query { ok: Boolean }',
      errors: { edges: [] },
    },
    schemaVersion: {
      id: `version-${slug}`,
      schemas: {
        edges: Array.from({ length: services }, (_, index) => ({
          node: {
            id: `schema-${slug}-${index}`,
            service: `service-${index}`,
            source: 'type Query',
          },
        })),
      },
    },
  };
}

describe('NativeCompositionDiff', () => {
  it('lists the targets as tabs and shows the report of the selected one', () => {
    urql.query.data = {
      project: {
        id: 'project-1',
        slug: 'gateway',
        nativeFederationCompatibility: {
          status: NativeFederationCompatibilityStatusType.Compatible,
          results: [result('staging', 0), result('production', 2)],
        },
      },
    };
    render(
      <ToastProvider>
        <NativeCompositionDiff projectId="project-1" />
      </ToastProvider>,
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(tab => tab.textContent)).toEqual(['staging', 'production']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('This target has no services published.')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'production' }));
    expect(screen.getByRole('tab', { name: 'production' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByText(/matches for this target/)).toBeTruthy();
  });
});
