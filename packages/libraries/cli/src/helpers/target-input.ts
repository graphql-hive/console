import { z } from 'zod';
import * as GraphQLSchema from '../gql/graphql';

type ParseError = {
  type: 'error';
};

type ParseOk = {
  type: 'ok';
  data: GraphQLSchema.TargetReferenceInput;
};

const UUIDModel = z.string().uuid();

/**
 * Parse a target slug into its parts. Returns an error if slug is invalid
 */
export function parse(str: string): ParseError | ParseOk {
  const uuidResult = UUIDModel.safeParse(str);

  if (uuidResult.success) {
    return {
      type: 'ok',
      data: {
        byId: uuidResult.data,
      },
    };
  }

  const parts = str.split('/');

  const organizationSlug = parts.at(0);
  const projectSlug = parts.at(1);
  const targetSlug = parts.at(2);

  if (!organizationSlug || !projectSlug || !targetSlug || parts.length > 3) {
    return {
      type: 'error',
    };
  }

  return {
    type: 'ok',
    data: {
      bySelector: {
        organizationSlug,
        projectSlug,
        targetSlug,
      },
    },
  };
}
