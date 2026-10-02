import { invariant } from '@hive/service-common';
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
  const graph = await injector.get(GraphStore).findGraphForTargetIdByName(target.id, 'default');
  invariant(graph, "No graph with name 'default' exists.");
  return injector.get(SchemaManager).getMaybeLatestVersionForGraph(graph);
};
