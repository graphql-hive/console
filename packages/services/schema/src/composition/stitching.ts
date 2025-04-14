import { buildASTSchema, concatAST, DocumentNode, Kind, parse, printSchema } from 'graphql';
import { validateSDL } from 'graphql/validation/validate.js';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { errorWithSource, toValidationError } from '../lib/errors';
import { trimDescriptions } from '../lib/trim-descriptions';
import type { ComposeAndValidateInput } from '../types';
import type { CompositionErrorType } from './shared';

const { allStitchingDirectivesTypeDefs, stitchingDirectivesValidator } = stitchingDirectives();
const parsedStitchingDirectives = parse(allStitchingDirectivesTypeDefs);
const stitchingDirectivesNames = extractDirectiveNames(parsedStitchingDirectives);

function extractDirectiveNames(doc: DocumentNode) {
  const directives: string[] = [];

  for (const definition of doc.definitions) {
    if (definition.kind === Kind.DIRECTIVE_DEFINITION) {
      directives.push(definition.name.value);
    }
  }

  return directives;
}

function definesStitchingDirective(doc: DocumentNode) {
  return extractDirectiveNames(doc).some(name => stitchingDirectivesNames.includes(name));
}

function validateStitchedSchema(doc: DocumentNode) {
  const definesItsOwnStitchingDirectives = definesStitchingDirective(doc);
  const fullDoc = definesItsOwnStitchingDirectives
    ? doc
    : concatAST([parsedStitchingDirectives, doc]);
  const errors = validateSDL(fullDoc).map(errorWithSource('graphql'));

  // If the schema defines its own stitching directives,
  // it means we can't be sure that it follows the official spec.
  if (definesItsOwnStitchingDirectives) {
    return errors;
  }

  try {
    stitchingDirectivesValidator(
      buildASTSchema(fullDoc, {
        assumeValid: true,
        assumeValidSDL: true,
      }),
    );
  } catch (error) {
    errors.push(toValidationError(error, 'composition'));
  }

  return errors;
}

export type ComposeStitchingArgs = {
  schemas: ComposeAndValidateInput;
};

export async function composeStitching(args: ComposeStitchingArgs) {
  const parsed = args.schemas.map(s => parse(s.raw));
  const errors: Array<CompositionErrorType> = parsed
    .map(schema => validateStitchedSchema(schema))
    .flat();

  let sdl: string | null = null;
  try {
    sdl = printSchema(
      stitchSchemas({
        subschemas: args.schemas.map(schema =>
          buildASTSchema(trimDescriptions(parse(schema.raw)), {
            assumeValid: true,
            assumeValidSDL: true,
          }),
        ),
      }),
    );
  } catch (error) {
    errors.push(toValidationError(error, 'composition'));
  }

  return {
    errors,
    sdl,
    supergraph: null,
    contracts: null,
    tags: null,
    schemaMetadata: null,
    metadataAttributes: null,
  };
}
