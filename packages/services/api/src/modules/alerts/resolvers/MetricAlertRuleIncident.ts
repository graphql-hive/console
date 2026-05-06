import type { MetricAlertRuleIncidentResolvers } from './../../../__generated__/types';

/**
 * No explicit field resolvers needed: every GraphQL field on
 * `MetricAlertRuleIncident` has a same-named, type-compatible field on the
 * `MetricAlertIncident` mapper (see `module.graphql.mappers.ts` and
 * `shared/entities.ts:473`), so the default resolver — `parent[fieldName]` —
 * handles all of them.
 *
 * This file exists because codegen generates a resolver stub for any object
 * type with a declared mapper (the `resolverGeneration: 'minimal'` mode).
 * Empty body is intentional, not a TODO. Removing the file would cause
 * codegen to regenerate it on the next `pnpm graphql:generate`.
 */
export const MetricAlertRuleIncident: MetricAlertRuleIncidentResolvers = {};
