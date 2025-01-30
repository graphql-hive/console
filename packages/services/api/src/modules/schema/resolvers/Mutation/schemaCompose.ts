import { IdTranslator } from '../../../shared/providers/id-translator';
import { SchemaManager } from '../../providers/schema-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaCompose: NonNullable<MutationResolvers['schemaCompose']> = async (
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

  const result = await injector.get(SchemaManager).compose({
    onlyComposable: input.useLatestComposableVersion === true,
    services: input.services,
    ...selector,
  });

  if (result.kind === 'error') {
    return {
      __typename: 'SchemaComposeError',
      message: result.message,
    };
  }

  return {
    __typename: 'SchemaComposeSuccess',
    valid: 'supergraphSDL' in result && result.supergraphSDL !== null,
    compositionResult: {
      errors: result.errors,
      supergraphSdl: result.supergraphSDL,
    },
  };
};
