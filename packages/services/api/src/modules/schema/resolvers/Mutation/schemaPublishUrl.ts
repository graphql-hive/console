import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaPublishUrl: NonNullable<MutationResolvers['schemaPublishUrl']> = async (
  _parent,
  { input },
  { injector, request },
) => {
  const result = await injector.get(SchemaPublisher).publishUrl(
    {
      ...input,
      service: input.service?.toLowerCase(),
    },
    request.signal,
  );

  switch (result.__typename) {
    case 'SchemaPublishSuccess': {
      return {
        ...result,
        valid: true,
        __typename: 'SchemaPublishUrlSuccess',
      };
    }
    case 'SchemaPublishError': {
      return {
        valid: false,
        errors: result.errors,
        changes: result.changes,
        linkToWebsite: result.linkToWebsite,
        __typename: 'SchemaPublishUrlError',
      };
    }
    case 'GitHubSchemaPublishSuccess': {
      return {
        valid: true,
        __typename: 'SchemaPublishUrlSuccess',
        message: result.message,
      };
    }
    case 'GitHubSchemaPublishError': {
      return {
        valid: false,
        ...result,
        errors: result.errors ?? [{ message: result.message }],
        __typename: 'SchemaPublishUrlError',
      };
    }
    case 'SchemaPublishRetry':
      return result;
    default: {
      return {
        __typename: 'SchemaPublishUrlError',
        valid: false,
        errors: [{ message: 'Something went wrong...' }],
      };
    }
  }
};
