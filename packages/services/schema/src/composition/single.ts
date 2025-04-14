import {
  buildASTSchema,
  DocumentNode,
  GraphQLError,
  isTypeSystemExtensionNode,
  parse,
  print,
  validateSchema,
} from 'graphql';
import { validateSDL } from 'graphql/validation/validate.js';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { errorWithSource, type CompositionErrorSource } from '../lib/errors';
import { trimDescriptions } from '../lib/trim-descriptions';
import type { ComposeAndValidateInput } from '../types';
import type { CompositionErrorType } from './shared';

export type ComposeSingleArgs = {
  schemas: ComposeAndValidateInput;
};

export async function composeSingle(args: ComposeSingleArgs) {
  const schema = args.schemas[0];
  let schemaAst = parse(schema.raw);

  // If the schema contains type system extension nodes, merge them into the schema.
  // We don't want to show many type extension of User, we want to show single User type.
  if (schemaAst.definitions.some(isTypeSystemExtensionNode)) {
    schemaAst = mergeTypeDefs(schemaAst);
  }
  const errors: Array<CompositionErrorType> = validateSingleSDL(schemaAst);

  return {
    errors,
    sdl: print(trimDescriptions(schemaAst)),
    supergraph: null,
    contracts: null,
    tags: null,
    schemaMetadata: null,
    metadataAttributes: null,
  };
}

function validateSingleSDL(document: DocumentNode): Array<{
  message: string;
  source: CompositionErrorSource;
}> {
  const errors = validateSDL(document);

  if (errors.length) {
    return errors.map(errorWithSource('graphql'));
  }

  try {
    const schema = buildASTSchema(document);
    const errors = validateSchema(schema);

    if (errors.length) {
      return errors.map(errorWithSource('graphql'));
    }
  } catch (err: unknown) {
    if (err instanceof GraphQLError) {
      return [errorWithSource('graphql')(err)];
    }
    throw err;
  }

  return [];
}
