import { createHash } from 'node:crypto';
import stringify from 'fast-json-stable-stringify';
import { Session } from '../../../auth/lib/authz';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaDelete: NonNullable<MutationResolvers['schemaDelete']> = async (
  _,
  { input },
  { injector, request },
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

  const token = injector.get(Session).getLegacySelector();

  const checksum = createHash('md5')
    .update(
      stringify({
        ...input,
        serviceName: input.serviceName.toLowerCase(),
      }),
    )
    .update(token.token)
    .digest('base64');

  const result = await injector.get(SchemaPublisher).delete(
    {
      dryRun: input.dryRun,
      serviceName: input.serviceName.toLowerCase(),
      organizationId: selector.organizationId,
      projectId: selector.projectId,
      targetId: selector.targetId,
      checksum,
    },
    request.signal,
  );

  return {
    ...result,
    changes: result.changes,
    errors: result.errors?.map(error => ({
      ...error,
      path: 'path' in error ? error.path?.split('.') : null,
    })),
  };
};
