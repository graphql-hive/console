import { invariant } from '@hive/service-common';
import { Session } from '../../../auth/lib/authz';
import { GraphStore } from '../../../graph/providers/graph-store';
import { SchemaManager } from '../../../schema/providers/schema-manager';
import { SchemaVersionHelper } from '../../../schema/providers/schema-version-helper';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../../target/providers/target-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const lab: NonNullable<QueryResolvers['lab']> = async (_, { selector }, { injector }) => {
  const translator = injector.get(IdTranslator);
  const [organization, project, targetId] = await Promise.all([
    translator.translateOrganizationId(selector),
    translator.translateProjectId(selector),
    translator.translateTargetId(selector),
  ]);

  await injector.get(Session).assertPerformAction({
    action: 'laboratory:describe',
    organizationId: organization,
    params: {
      organizationId: organization,
      projectId: project,
      targetId,
    },
  });

  const target = await injector.get(TargetManager).getTargetById({ targetId });

  const schemaManager = injector.get(SchemaManager);

  const graph = await injector.get(GraphStore).findGraphForTargetIdByName(target.id, 'default');
  invariant(graph, "No graph with name 'default' exists.");

  const latestSchema = await schemaManager.getMaybeLatestValidVersionForGraph(graph);

  if (!latestSchema) {
    return null;
  }

  const sdl = await injector.get(SchemaVersionHelper).getCompositeSchemaSdl(latestSchema);

  if (!sdl) {
    throw new Error('This cannot happen.');
  }

  return {
    schema: sdl,
    mocks: {},
  };
};
