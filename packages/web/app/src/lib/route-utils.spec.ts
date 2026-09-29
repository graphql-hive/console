import { parse } from 'graphql';
import { filter, map, pipe } from 'wonka';
import { createClient, makeResult, type Exchange, type Operation } from '@urql/core';
import { isSafeRedirectPath, loadQuery, redirectToPathSchema } from './route-utils';

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
