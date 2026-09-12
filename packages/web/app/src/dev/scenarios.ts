import type { IMockStore } from '@graphql-tools/mock';

type Resolver = (parent: any, args: any) => unknown;
export type ResolverMap = Record<string, Record<string, Resolver>>;

export type Scenario = {
  name: string;
  description: string;
  seed?: number;
  /** Value for every Boolean field named viewerCan*. Default true. */
  viewerCan?: boolean;
  /** Constants keyed by "Type.field"; null is allowed for nullable fields. Applied last. */
  fields?: Record<`${string}.${string}`, unknown>;
  /** Resolver overrides, typically returning fixtures. Win over the generated ones. */
  resolvers?: (ctx: { store: IMockStore }) => ResolverMap;
};

export const DEFAULT_SCENARIO = 'default';

export const scenarios: Record<string, Scenario> = {
  default: {
    name: 'default',
    description: 'PRO plan, every gate open, realistic data',
  },
};
