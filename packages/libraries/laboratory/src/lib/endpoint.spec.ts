// @vitest-environment happy-dom
import { buildSchema } from 'graphql';
import { act, renderHook } from '@testing-library/react';
import { useEndpoint } from './endpoint';

const load = vi.fn();

vi.mock('@graphql-tools/url-loader', () => ({
  UrlLoader: class {
    load(...args: unknown[]) {
      return load(...args);
    }
  },
  SubscriptionProtocol: { GRAPHQL_SSE: 'GRAPHQL_SSE' },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const ENDPOINT = 'http://localhost:4000/graphql';
const SDL = 'type Query { me: String }';

/** The debounce is 500ms and the schema poll interval is 5s. */
const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe('useEndpoint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    load.mockReset();
    load.mockResolvedValue([{ schema: buildSchema(SDL) }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the same GraphQLSchema reference when a poll returns an unchanged schema', async () => {
    const { result } = renderHook(() => useEndpoint({ defaultEndpoint: ENDPOINT }));

    await advance(600);
    const schema = result.current.schema;
    expect(schema).not.toBeNull();

    await advance(6000);
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.schema).toBe(schema);
  });

  it('produces a new GraphQLSchema reference when the schema changes', async () => {
    const { result } = renderHook(() => useEndpoint({ defaultEndpoint: ENDPOINT }));

    await advance(600);
    const schema = result.current.schema;

    load.mockResolvedValue([{ schema: buildSchema('type Query { me: String, id: ID! }') }]);

    await advance(6000);
    expect(result.current.schema).not.toBe(schema);
    expect(result.current.schema?.getQueryType()?.getFields().id).toBeDefined();
  });

  it('clears the schema when fetching without an endpoint', async () => {
    const { result } = renderHook(() => useEndpoint({ defaultEndpoint: ENDPOINT }));

    await advance(600);
    expect(result.current.schema).not.toBeNull();

    // Note: no effect fetches on an empty endpoint, so this drives fetchSchema directly.
    act(() => {
      result.current.setEndpoint('');
    });
    act(() => {
      result.current.fetchSchema();
    });
    await advance(600);

    expect(result.current.schema).toBeNull();
  });
});
