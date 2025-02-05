import { SchemaManager } from '../../providers/schema-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaCompose: NonNullable<MutationResolvers['schemaCompose']> = async (
  _,
  { input },
  { injector },
) => {
  const result = await injector.get(SchemaManager).compose({
    onlyComposable: input.useLatestComposableVersion === true,
    services: input.services,
    target: input.target ?? null,
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
