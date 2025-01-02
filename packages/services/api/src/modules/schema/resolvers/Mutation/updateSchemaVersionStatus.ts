import { IdTranslator } from '../../../shared/providers/id-translator';
import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateSchemaVersionStatus: NonNullable<
  MutationResolvers['updateSchemaVersionStatus']
> = async (_, { input }, { injector }) => {
  const translator = injector.get(IdTranslator);
  const [organization, project, target] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
    translator.translateTargetId(input),
  ]);

  return injector.get(SchemaPublisher).updateVersionStatus({
    versionId: input.versionId,
    valid: input.valid,
    organizationId: organization,
    projectId: project,
    targetId: target,
  });
};
