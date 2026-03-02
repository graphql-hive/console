import { parse as jsUrlParse, stringify as jsUrlStringify } from 'jsurl2';
import { z } from 'zod';

/**
 * Simulates TanStack Router's stringifySearchWith per-value behavior.
 * See node_modules/@tanstack/react-router/dist/esm/searchParams.js
 *
 * Only objects/arrays go through the custom stringify.
 * Primitives (string, number, boolean) pass through unchanged.
 */
function simulateStringify(val: unknown): unknown {
  if (typeof val === 'object' && val !== null) {
    try {
      return jsUrlStringify(val);
    } catch {
      return val;
    }
  }
  return val;
}

/**
 * Simulates TanStack Router's parseSearchWith per-value behavior.
 * Each value is passed through the parser in a try/catch.
 * On failure, the raw string is kept.
 */
function simulateParse(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  try {
    return jsUrlParse(val);
  } catch {
    return val;
  }
}

function roundTrip(val: unknown): unknown {
  return simulateParse(simulateStringify(val));
}

describe('search params serialization (jsurl2)', () => {
  it('round-trips string params (auth, settings, dates, enums)', () => {
    const strings = [
      '/org/project/target', // redirectToPath
      '/', // redirectToPath default
      'user@example.com', // email
      'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc', // JWT token
      'oidc-provider-123', // oidc id
      'my search query', // search
      'requests', // sortBy enum
      'asc', // sortOrder enum
      'general', // page enum
      '2025-02-18T00:00:00Z', // date string
      'abc-123-def', // version string
      'Query.users', // coordinate
      'span-abc-123', // activeSpanId
    ];
    for (const str of strings) {
      expect(roundTrip(str)).toBe(str);
    }
  });

  it('round-trips boolean params (checks filters)', () => {
    expect(roundTrip(false)).toBe(false);
    expect(roundTrip(true)).toBe(true);
  });

  it('round-trips number params (proposal timestamp)', () => {
    expect(roundTrip(1_709_251_200)).toBe(1_709_251_200);
  });

  it('round-trips array of strings (operations, proposals stage/user)', () => {
    expect(roundTrip(['hash1', 'hash2'])).toEqual(['hash1', 'hash2']);
    expect(roundTrip(['open', 'approved'])).toEqual(['open', 'approved']);
    expect(roundTrip(['user-1', 'user-2'])).toEqual(['user-1', 'user-2']);
  });

  it('round-trips array of objects (insights clients)', () => {
    const clients = [{ name: 'Hive CLI' }, { name: 'WebApp', versions: ['v1', 'v2'] }];
    expect(roundTrip(clients)).toEqual(clients);
  });

  it('round-trips complex objects (traces filter and sort)', () => {
    const filter = {
      'graphql.status': ['OK'],
      'trace.id': [],
      duration: [100, 5000],
    };
    expect(roundTrip(filter)).toEqual(filter);

    const sort = { id: 'timestamp', desc: true };
    expect(roundTrip(sort)).toEqual(sort);
  });

  it('parses legacy JSON-encoded URLs (backwards compatibility)', () => {
    // Old bookmarked URLs used JSON.stringify — jsUrlParse must handle them
    expect(simulateParse('{"name":"test","versions":null}')).toEqual({
      name: 'test',
      versions: null,
    });
    expect(simulateParse('["op1","op2"]')).toEqual(['op1', 'op2']);
    expect(simulateParse('"2025-02-18"')).toBe('2025-02-18');
  });

  it('restores null versions via Zod default when key is omitted', () => {
    const InsightsClientFilter = z.object({
      name: z.string(),
      versions: z.array(z.string()).nullable().default(null),
    });

    // When versions is omitted from URL (our new behavior), Zod restores null
    expect(InsightsClientFilter.parse({ name: 'Hive CLI' })).toEqual({
      name: 'Hive CLI',
      versions: null,
    });

    // When versions is explicitly undefined, Zod also restores null
    expect(InsightsClientFilter.parse({ name: 'Hive CLI', versions: undefined })).toEqual({
      name: 'Hive CLI',
      versions: null,
    });

    // When versions is present, it passes through
    expect(InsightsClientFilter.parse({ name: 'Hive CLI', versions: ['v1'] })).toEqual({
      name: 'Hive CLI',
      versions: ['v1'],
    });
  });
});
