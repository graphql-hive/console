import { QueryPlanSchema, type QueryPlan } from './schema';

/**
 * Reads extensions.queryPlan out of a stored response body.
 *
 * Returns null for anything unusable, including a body that is not JSON: history
 * entries hold whatever the server sent, so parsing can throw during render.
 */
export function parseQueryPlan(response: string | null | undefined): QueryPlan | null {
  if (!response) {
    return null;
  }

  let queryPlan: unknown;

  try {
    queryPlan = JSON.parse(response)?.extensions?.queryPlan;
  } catch {
    return null;
  }

  if (!queryPlan) {
    return null;
  }

  const result = QueryPlanSchema.safeParse(queryPlan);

  return result.success ? result.data : null;
}
