import type { QueryResolvers } from '../../../../__generated__/types';
import { GraphStore } from '../../../graph/providers/graph-store';
import { TargetManager } from '../../../target/providers/target-manager';
import { SchemaManager } from '../../providers/schema-manager';

export const latestVersion: NonNullable<QueryResolvers['latestVersion']> = async (
  _,
  __,
  { injector },
) => {
  const target = await injector.get(TargetManager).getTargetFromToken();
  const graph = await injector.get(GraphStore).getDefaultGraphForTargetId(target.id);
  return injector.get(SchemaManager).getMaybeLatestVersionForGraph(graph);
};
