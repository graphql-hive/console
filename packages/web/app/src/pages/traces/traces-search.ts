import { z } from 'zod';

export const TRACES_DURATION_BOUNDS = { min: 0, max: 100_000 };

const names = z.array(z.coerce.string()).optional().catch(undefined);

/** The traces filter, one top-level search param per dimension. An unreadable param is ignored. */
export const TracesFilterSearch = z.object({
  durationMin: z.number().int().nonnegative().optional().catch(undefined),
  durationMax: z.number().int().positive().optional().catch(undefined),
  traceIds: names,
  status: z.enum(['ok', 'error']).optional().catch(undefined),
  operationTypes: z
    .array(z.enum(['query', 'mutation', 'subscription', 'unknown']))
    .optional()
    .catch(undefined),
  operationNames: names,
  clientNames: names,
  subgraphNames: names,
  errorCodes: names,
  httpStatusCodes: names,
  httpMethods: names,
  httpHosts: names,
  httpRoutes: names,
  httpUrls: names,
});

export type TracesFilter = z.infer<typeof TracesFilterSearch>;

export const tracesFilterKeys = TracesFilterSearch.keyof().options;

/** The search without any traces filter param, for a write that replaces the whole filter. */
export function withoutTracesFilter<T extends Record<string, unknown>>(search: T) {
  const rest: Record<string, unknown> = { ...search };
  for (const key of tracesFilterKeys) {
    delete rest[key];
  }
  return rest as Omit<T, keyof TracesFilter>;
}

const legacyList = <T extends z.ZodTypeAny>(item: T) => z.array(item).optional();

/** The pre-2026-11 `?filter={...}` param, kept to redirect old links. */
export const LegacyTracesFilter = z.object({
  duration: z.union([z.tuple([z.number(), z.number()]), z.tuple([])]).optional(),
  'trace.id': legacyList(z.string()),
  'graphql.status': legacyList(z.string()),
  'graphql.kind': legacyList(z.string().nullable()),
  'graphql.subgraph': legacyList(z.string()),
  'graphql.operation': legacyList(z.string()),
  'graphql.client': legacyList(z.string()),
  'graphql.errorCode': legacyList(z.string()),
  'http.status': legacyList(z.string()),
  'http.method': legacyList(z.string()),
  'http.host': legacyList(z.string()),
  'http.route': legacyList(z.string()),
  'http.url': legacyList(z.string()),
});

export type LegacyTracesFilter = z.infer<typeof LegacyTracesFilter>;

const nonEmpty = <T>(list: T[] | undefined) => (list?.length ? list : undefined);

/** Maps the old nested filter onto flat params, leaving out anything that filters nothing. */
export function flattenLegacyTracesFilter(old: LegacyTracesFilter): TracesFilter {
  const [durationMin, durationMax] = old.duration ?? [];
  const statuses = new Set(old['graphql.status']);
  const flat: TracesFilter = {
    durationMin: durationMin ? durationMin : undefined,
    // The old reset wrote 100000, which silently capped traces at 100 s.
    durationMax:
      durationMax !== undefined && durationMax < TRACES_DURATION_BOUNDS.max
        ? durationMax
        : undefined,
    traceIds: nonEmpty(old['trace.id']),
    status: statuses.size === 1 ? (statuses.has('ok') ? 'ok' : 'error') : undefined,
    operationTypes: nonEmpty(
      old['graphql.kind']?.flatMap(kind => {
        const type = kind === null ? 'unknown' : kind.toLowerCase();
        return type === 'query' ||
          type === 'mutation' ||
          type === 'subscription' ||
          type === 'unknown'
          ? [type]
          : [];
      }),
    ),
    operationNames: nonEmpty(old['graphql.operation']),
    clientNames: nonEmpty(old['graphql.client']),
    subgraphNames: nonEmpty(old['graphql.subgraph']),
    errorCodes: nonEmpty(old['graphql.errorCode']),
    httpStatusCodes: nonEmpty(old['http.status']),
    httpMethods: nonEmpty(old['http.method']),
    httpHosts: nonEmpty(old['http.host']),
    httpRoutes: nonEmpty(old['http.route']),
    httpUrls: nonEmpty(old['http.url']),
  };
  return Object.fromEntries(
    Object.entries(flat).filter(([, value]) => value !== undefined),
  ) as TracesFilter;
}
