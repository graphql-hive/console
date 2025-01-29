import { MarqueeRows } from '@theguild/components';

const terms = new Map<string[], string /* href */>([
  [
    ['authenticated', 'requiresScopes', 'policy'],
    'https://the-guild.dev/graphql/hive/docs/gateway/authorization-authentication#granular-protection-using-auth-directives-authenticated-requiresscopes-and-policy',
  ],
  [['Monitoring', 'Tracing'], 'https://the-guild.dev/graphql/hive/docs/gateway/monitoring-tracing'],
  [
    ['@stream', '@defer', 'Incremental Delivery'],
    'https://the-guild.dev/graphql/hive/docs/gateway/defer-stream',
  ],
  [['Persisted Documents'], 'https://the-guild.dev/graphql/hive/docs/gateway/persisted-documents'],
  [
    ['Response Caching'],
    'https://the-guild.dev/graphql/hive/docs/gateway/other-features/performance/response-caching',
  ],
  [
    ['Content-Encoding'],
    'https://the-guild.dev/graphql/hive/docs/gateway/other-features/performance/compression',
  ],
  [
    ['parserAndValidationCache'],
    'https://the-guild.dev/graphql/hive/docs/gateway/other-features/performance/parsing-and-validation-caching',
  ],
  [
    ['executionCancellation'],
    'https://the-guild.dev/graphql/hive/docs/gateway/other-features/performance/execution-cancellation',
  ],
  [
    ['Upstream Cancellation'],
    'https://the-guild.dev/graphql/hive/docs/gateway/other-features/performance/upstream-cancellation',
  ],
  [
    ['HTTP Caching'],
    'https://the-guild.dev/graphql/hive/docs/gateway/other-features/performance/http-caching',
  ],
  [
    ['useRequestDeduplication'],
    'https://the-guild.dev/graphql/hive/docs/gateway/other-features/performance/deduplicate-request',
  ],
  [
    ['APQ', 'Automatic Persisted Queries'],
    'https://the-guild.dev/graphql/hive/docs/gateway/other-features/performance/automatic-persisted-queries',
  ],
  [['Persisted Documents'], 'https://the-guild.dev/graphql/hive/docs/gateway/persisted-documents'],
  [
    ['Supergraph', 'Proxy Source'],
    'https://the-guild.dev/graphql/hive/docs/gateway/supergraph-proxy-source',
  ],
  [
    ['Authorization', 'Authentication'],
    'https://the-guild.dev/graphql/hive/docs/gateway/authorization-authentication',
  ],
  [
    ['Header Propagation'],
    'https://the-guild.dev/graphql/hive/docs/gateway/other-features/header-propagation',
  ],
]);

export function GatewayMarqueeRows() {
  return <div />;
}
