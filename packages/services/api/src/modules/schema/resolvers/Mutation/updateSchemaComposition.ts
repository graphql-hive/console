import { HiveError } from '../../../../shared/errors';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { SchemaManager } from '../../providers/schema-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateSchemaComposition: NonNullable<
  MutationResolvers['updateSchemaComposition']
> = async (_, { input }, { injector, session }) => {
  const translator = injector.get(IdTranslator);
  const projectReference = await translator.resolveProjectReference({
    reference: input.project,
  });

  if (!projectReference) {
    return session.raise('project:describe');
  }

  if (input.method.native) {
    return injector.get(SchemaManager).updateSchemaComposition({
      projectId: projectReference.projectId,
      organizationId: projectReference.organizationId,
      mode: 'native',
    });
  }
  if (input.method.legacy) {
    return injector.get(SchemaManager).updateSchemaComposition({
      projectId: projectReference.projectId,
      organizationId: projectReference.organizationId,
      mode: 'legacy',
    });
  }
  if (input.method.external) {
    return injector.get(SchemaManager).updateSchemaComposition({
      projectId: projectReference.projectId,
      organizationId: projectReference.organizationId,
      mode: 'external',
      endpoint: input.method.external.endpoint,
      secret: input.method.external.secret,
    });
  }

  throw new HiveError('Unexpected input');
};
