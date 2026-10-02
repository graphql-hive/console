import { invariant } from '@hive/service-common';
import type { QueryResolvers } from '../../../../__generated__/types';
import { GraphStore } from '../../../graph/providers/graph-store';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../../target/providers/target-manager';
import { SchemaManager } from '../../providers/schema-manager';

export const latestValidVersion: NonNullable<QueryResolvers['latestValidVersion']> = async (
  _,
  args,
  { injector, session },
) => {
  const selector = await injector.get(IdTranslator).resolveTargetReference({
    reference: args.target ?? null,
  });

  if (!selector) {
    session.raise('project:describe');
  } else {
    await session.assertPerformAction({
      action: 'project:describe',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    const target = await injector.get(TargetManager).getTargetById({ targetId: selector.targetId });
    const graph = await injector.get(GraphStore).findGraphForTargetIdByName(target.id, 'default');
    invariant(graph, "No graph with name 'default' exists.");
    return injector.get(SchemaManager).getMaybeLatestValidVersionForGraph(graph);
  }
};
