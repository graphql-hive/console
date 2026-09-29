// @vitest-environment jsdom
import { parse } from 'graphql';
import { filter, map, pipe } from 'wonka';
import {
  organizationLayout,
  projectLayout,
  SLUGS,
  targetLayout,
} from '@/lib/testing/fixtures/layouts';
import { createTestClient } from '@/lib/testing/urql';
import { isRedirect } from '@tanstack/react-router';
import { createClient, makeResult, type Exchange, type Operation } from '@urql/core';
import {
  defaultRange,
  isSafeRedirectPath,
  loadQuery,
  redirectToPathSchema,
  requireLayoutFlag,
  revalidate,
} from './route-utils';

// The updaters import pages; these stand in for what cannot load under jsdom.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    error => error,
  );
}

function redirectOf(error: unknown) {
  if (!isRedirect(error)) {
    throw new Error('expected a redirect');
  }
  return error.options as { to?: string; params?: unknown; search?: unknown };
}

describe('isSafeRedirectPath', () => {
  it.each(['/acme', '/acme/shop/prod?filter=1#top', '/'])(
    'accepts a path on this app: %s',
    path => {
      expect(isSafeRedirectPath(path)).toBe(true);
    },
  );

  it.each([
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    'acme',
    '',
  ])('rejects anything that could leave the app: %s', value => {
    expect(isSafeRedirectPath(value)).toBe(false);
  });
});

describe('redirectToPathSchema', () => {
  it('keeps a safe path and sends everything else home', () => {
    expect(redirectToPathSchema.parse('/acme/shop')).toBe('/acme/shop');
    expect(redirectToPathSchema.parse('//evil.example')).toBe('/');
    expect(redirectToPathSchema.parse(undefined)).toBe('/');
  });
});

describe('loadQuery', () => {
  const probe = parse('query Probe { __typename }');

  function clientRecording(seen: Operation[]) {
    const record: Exchange = () => operations$ =>
      pipe(
        operations$,
        filter(operation => operation.kind !== 'teardown'),
        map(operation => {
          seen.push(operation);
          return makeResult(operation, { data: { __typename: 'Query' } });
        }),
      );
    return createClient({ url: 'http://test.invalid/graphql', exchanges: [record] });
  }

  it('runs the document on the client in router context, cache-first, tagged with the preload flag', async () => {
    const seen: Operation[] = [];
    const loader = { context: { urqlClient: clientRecording(seen) }, preload: true };

    const result = await loadQuery(loader, probe, {});

    expect(result.data).toEqual({ __typename: 'Query' });
    expect(seen).toHaveLength(1);
    expect(seen[0].context.requestPolicy).toBe('cache-first');
    expect(seen[0].context.preload).toBe(true);
  });

  it('passes another request policy through', async () => {
    const seen: Operation[] = [];
    const loader = { context: { urqlClient: clientRecording(seen) }, preload: false };

    await loadQuery(loader, probe, {}, 'cache-and-network');

    expect(seen[0].context.requestPolicy).toBe('cache-and-network');
    expect(seen[0].context.preload).toBe(false);
  });
});

describe('revalidate', () => {
  it('revalidates on a visit and only warms on a preload', () => {
    expect(revalidate({ preload: false })).toBe('cache-and-network');
    expect(revalidate({ preload: true })).toBe('cache-first');
  });
});

describe('requireLayoutFlag', () => {
  function loader<Params>(client: ReturnType<typeof createTestClient>, params: Params) {
    return { context: { urqlClient: client }, preload: false, params };
  }

  it('admits a viewer with the flag, reading the layout document once for all gates', async () => {
    const client = createTestClient(new Map([['TargetLayoutQuery', targetLayout()]]));

    await requireLayoutFlag.target(loader(client, SLUGS), 'viewerCanUseMetricAlertRules');
    await requireLayoutFlag.target(loader(client, SLUGS), 'viewerCanViewLaboratory');

    expect(client.requests('TargetLayoutQuery')).toHaveLength(1);
  });

  it('asks with the slugs alone, so the layout route above it was the same request', async () => {
    const client = createTestClient(new Map([['TargetLayoutQuery', targetLayout()]]));

    await requireLayoutFlag.target(
      loader(client, { ...SLUGS, operationHash: 'abc' }),
      'viewerCanViewLaboratory',
    );

    expect(client.requests('TargetLayoutQuery')[0].variables).toEqual(SLUGS);
  });

  it('sends a viewer without the flag to the scope root', async () => {
    const client = createTestClient(
      new Map([['TargetLayoutQuery', targetLayout({ viewerCanUseMetricAlertRules: false })]]),
    );

    const error = await rejection(
      requireLayoutFlag.target(loader(client, SLUGS), 'viewerCanUseMetricAlertRules'),
    );

    expect(redirectOf(error)).toMatchObject({
      to: '/$organizationSlug/$projectSlug/$targetSlug',
      params: SLUGS,
    });
  });

  it('with several flags, redirects only when every one is false', async () => {
    const client = createTestClient(
      new Map([['ProjectLayoutQuery', projectLayout({ viewerCanModifySettings: false })]]),
    );
    const { organizationSlug, projectSlug } = SLUGS;
    const params = { organizationSlug, projectSlug };

    await requireLayoutFlag.project(
      loader(client, params),
      'viewerCanModifySettings',
      'viewerCanManageProjectAccessTokens',
    );

    const neither = createTestClient(
      new Map([
        [
          'ProjectLayoutQuery',
          projectLayout({
            viewerCanModifySettings: false,
            viewerCanManageProjectAccessTokens: false,
          }),
        ],
      ]),
    );
    const error = await rejection(
      requireLayoutFlag.project(
        loader(neither, params),
        'viewerCanModifySettings',
        'viewerCanManageProjectAccessTokens',
      ),
    );
    expect(redirectOf(error)).toMatchObject({ to: '/$organizationSlug/$projectSlug', params });
  });

  it('gates the organization at its own root', async () => {
    const client = createTestClient(
      new Map([['OrganizationLayoutQuery', organizationLayout({ viewerCanSeeMembers: false })]]),
    );
    const params = { organizationSlug: SLUGS.organizationSlug };

    const error = await rejection(
      requireLayoutFlag.organization(loader(client, params), 'viewerCanSeeMembers'),
    );

    expect(redirectOf(error)).toMatchObject({ to: '/$organizationSlug', params });
  });

  it('admits on an error or missing data, leaving the page to show it', async () => {
    const failing = createTestClient(new Map([['TargetLayoutQuery', new Error('offline')]]));
    await requireLayoutFlag.target(loader(failing, SLUGS), 'viewerCanViewLaboratory');

    const empty = createTestClient(
      new Map([['TargetLayoutQuery', { __typename: 'Query', organization: null }]]),
    );
    await requireLayoutFlag.target(loader(empty, SLUGS), 'viewerCanViewLaboratory');
  });
});

describe('defaultRange', () => {
  const to = '/$organizationSlug/$projectSlug/$targetSlug/insights';
  const range = { from: 'now-7d', to: 'now' };

  it('sends a bare URL to the range, keeping the rest of its search and the params', () => {
    const beforeLoad = defaultRange(range, to);
    const search = { operations: ['abc'] };

    const error = (() => {
      try {
        beforeLoad({ search, params: SLUGS });
      } catch (caught) {
        return caught;
      }
    })();

    expect(redirectOf(error)).toMatchObject({
      to,
      params: SLUGS,
      search: { operations: ['abc'], from: 'now-7d', to: 'now' },
    });
  });

  it('leaves a URL that names either bound alone', () => {
    const beforeLoad = defaultRange(range, to);
    expect(beforeLoad({ search: { from: 'now-1d' }, params: SLUGS })).toBeUndefined();
    expect(beforeLoad({ search: { to: 'now' }, params: SLUGS })).toBeUndefined();
  });

  it('asks a range function on every bare URL, for a remembered range', () => {
    const remembered = vi
      .fn()
      .mockReturnValueOnce({ from: 'now-1d', to: 'now' })
      .mockReturnValueOnce({ from: 'now-30m', to: 'now' });
    const beforeLoad = defaultRange(remembered, to);
    const from = () => {
      try {
        beforeLoad({ search: {}, params: SLUGS });
      } catch (caught) {
        return (redirectOf(caught).search as { from: string }).from;
      }
    };

    expect(from()).toBe('now-1d');
    expect(from()).toBe('now-30m');
    expect(remembered).toHaveBeenCalledTimes(2);
  });
});
