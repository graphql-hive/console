import { Session } from '../../../auth/lib/authz';
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

  const latestSchema = await schemaManager.getMaybeLatestValidVersion(target);

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
