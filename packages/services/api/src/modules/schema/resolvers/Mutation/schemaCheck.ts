import { IdTranslator } from '../../../shared/providers/id-translator';
import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaCheck: NonNullable<MutationResolvers['schemaCheck']> = async (
  _,
  { input },
  { injector, session },
) => {
  let selector: {
    organizationId: string;
    projectId: string;
    targetId: string;
  };

  if (input.target) {
    const [organizationId, projectId, targetId] = await Promise.all([
      injector.get(IdTranslator).translateOrganizationId(input.target),
      injector.get(IdTranslator).translateProjectId(input.target),
      injector.get(IdTranslator).translateTargetId(input.target),
    ]);

    selector = {
      organizationId,
      projectId,
      targetId,
    };
  } else {
    // LEGACY method of resolving the permissions
    const { organizationId, projectId, targetId } = session.getLegacySelector();

    selector = {
      organizationId,
      projectId,
      targetId,
    };
  }

  const result = await injector.get(SchemaPublisher).check({
    ...input,
    service: input.service?.toLowerCase(),
    ...selector,
  });

  if ('changes' in result && result.changes) {
    return {
      ...result,
      changes: result.changes,
      errors:
        result.errors?.map(error => ({
          ...error,
          path: 'path' in error ? error.path?.split('.') : null,
        })) ?? [],
    };
  }

  return result;
};
