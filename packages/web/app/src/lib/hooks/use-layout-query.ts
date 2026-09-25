import { useQuery, type UseQueryState } from 'urql';
import {
  OrganizationLayoutQuery,
  ProjectLayoutQuery,
  TargetLayoutQuery,
} from '@/components/layouts/queries';
import { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';
import { useSlugs } from './use-slugs';

const queries = {
  organization: OrganizationLayoutQuery,
  project: ProjectLayoutQuery,
  target: TargetLayoutQuery,
};

type Scope = keyof typeof queries;
type Query<S extends Scope> = UseQueryState<
  ResultOf<(typeof queries)[S]>,
  VariablesOf<(typeof queries)[S]>
>;

// The layout above the page ran the same document, so this is a cache hit.
export function useLayoutQuery<S extends Scope>(scope: S): Query<S> {
  const [query] = useQuery({
    query: queries[scope] as (typeof queries)[S],
    variables: useSlugs(scope) as VariablesOf<(typeof queries)[S]>,
    requestPolicy: 'cache-first',
  });
  return query as Query<S>;
}
