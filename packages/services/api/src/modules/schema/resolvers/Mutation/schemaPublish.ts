import { parseResolveInfo } from 'graphql-parse-resolve-info';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaPublish: NonNullable<MutationResolvers['schemaPublish']> = async (
  _,
  { input },
  { injector, request, session },
  info,
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
  // We only want to resolve to SchemaPublishMissingUrlError if it is selected by the operation.
  // NOTE: This should be removed once the usage of cli versions that don't request on 'SchemaPublishMissingUrlError' is becomes pretty low.
  const parsedResolveInfoFragment = parseResolveInfo(info);
  const isSchemaPublishMissingUrlErrorSelected =
    !!parsedResolveInfoFragment?.fieldsByTypeName['SchemaPublishMissingUrlError'];

  const result = await injector.get(SchemaPublisher).publish(
    {
      ...input,
      service: input.service?.toLowerCase(),
      ...selector,
      isSchemaPublishMissingUrlErrorSelected,
    },
    request.signal,
  );

  if ('changes' in result) {
    return {
      ...result,
      changes: result.changes,
    };
  }

  return result;
};
