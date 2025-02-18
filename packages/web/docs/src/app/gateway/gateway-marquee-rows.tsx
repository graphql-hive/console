import { Anchor, cn, MarqueeRows } from '@theguild/components';

// todo: a test that checks if none of the links here are 404
const terms = new Map<string[], string /* href */>([
  [
    ['authenticated', 'requiresScopes', 'policy'],
    '/docs/gateway/authorization-authentication#granular-protection-using-auth-directives-authenticated-requiresscopes-and-policy',
  ],
  [['Usage Reporting'], 'https://the-guild.dev/graphql/hive/docs/gateway/usage-reporting'],
  [['Monitoring', 'Tracing'], '/docs/gateway/monitoring-tracing'],
  [['@stream', '@defer', 'Incremental Delivery'], '/docs/gateway/defer-stream'],
  [['Persisted Documents'], '/docs/gateway/persisted-documents'],
  [['Response Caching'], '/docs/gateway/other-features/performance/response-caching'],
  [['Content-Encoding'], '/docs/gateway/other-features/performance/compression'],
  [
    ['parserAndValidationCache'],
    '/docs/gateway/other-features/performance/parsing-and-validation-caching',
  ],
  [['executionCancellation'], '/docs/gateway/other-features/performance/execution-cancellation'],
  [['Upstream Cancellation'], '/docs/gateway/other-features/performance/upstream-cancellation'],
  [['documentCache', 'errorCache', 'validationCache'], '/docs/gateway/other-features/performance'],
  [['HTTP Caching'], '/docs/gateway/other-features/performance/http-caching'],
  [['useRequestDeduplication'], '/docs/gateway/other-features/performance/deduplicate-request'],
  [
    ['APQ', 'Automatic Persisted Queries'],
    '/docs/gateway/other-features/performance/automatic-persisted-queries',
  ],
  [['Persisted Documents'], '/docs/gateway/persisted-documents'],
  [
    ['batching', 'Request Batching'],
    'https://the-guild.dev/graphql/hive/docs/gateway/other-features/performance/request-batching',
  ],
  [['Supergraph', 'Proxy'], '/docs/gateway/supergraph-proxy-source'],
  [['Authorization', 'Authentication'], '/docs/gateway/authorization-authentication'],
  [['Header Propagation'], '/docs/gateway/other-features/header-propagation'],
  [['Subscriptions'], '/docs/gateway/subscriptions'],
  [['useMock', 'Mocking'], '/docs/gateway/other-features/testing/mocking'],
  [['Snapshots'], '/docs/gateway/other-features/testing/snapshot'],
  [['CSRF Prevention'], '/docs/gateway/other-features/security/csrf-prevention'],
  [['Rate Limiting'], '/docs/gateway/other-features/security/rate-limiting'],
  [['Cost Limit'], '/docs/gateway/other-features/security/cost-limit'],
  [['Security'], '/docs/gateway/other-features/security'],
  [['maskedErrors'], '/docs/gateway/other-features/security/error-masking'],
]);

export function GatewayMarqueeRows({
  className,
  ...rest
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <MarqueeRows
      pauseOnHover
      speed="slow"
      rows={9}
      className={cn('flex max-w-full flex-col justify-center rounded-2xl p-4 pb-28', className)}
      {...rest}
    >
      {inPlaceShuffle(
        Array.from(terms.entries()).flatMap(([labels, href], j) =>
          labels.map((label, i) => (
            <Anchor
              key={`${j}-${i}`}
              className="hive-focus rounded-lg border border-transparent bg-[--pill-bg] px-2 py-1.5 text-[10px] text-[--pill-text] transition duration-500 hover:border-[--pill-hover-text] hover:bg-[--pill-bg-hover] hover:text-[--pill-text-hover] sm:px-4 sm:py-3 sm:text-sm"
              href={href}
            >
              {label}
            </Anchor>
          )),
        ),
      )}
    </MarqueeRows>
  );
}

/**
 * @see https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 */
function inPlaceShuffle<T>(xs: T[]): T[] {
  for (let i = xs.length - 1; i >= 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = xs[i];
    xs[i] = xs[j];
    xs[j] = temp;
  }

  return xs;
}
