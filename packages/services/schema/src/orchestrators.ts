import type { FastifyRequest } from 'fastify';
import type { ConstDirectiveNode, DocumentNode, FieldDefinitionNode, NameNode } from 'graphql';
import {
  ASTNode,
  buildASTSchema,
  concatAST,
  GraphQLError,
  isTypeSystemExtensionNode,
  Kind,
  parse,
  print,
  printSchema,
  validateSchema,
  visit,
} from 'graphql';
import { validateSDL } from 'graphql/validation/validate.js';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import type { ServiceLogger } from '@hive/service-common';
import { extractLinkImplementations } from '@theguild/federation-composition';
import type { ContractsInputType } from './api';
import type { Cache } from './cache';
import { addInaccessibleToUnreachableTypes } from './lib/add-inaccessible-to-unreachable-types';
import {
  composeExternalFederation,
  composeFederationV1,
  composeFederationV2,
  ComposerMethodResult,
  SubgraphInput,
} from './lib/compose';
import { CompositionErrorSource, errorWithSource, toValidationError } from './lib/errors';
import {
  applyTagFilterOnSubgraphs,
  createTagDirectiveNameExtractionStrategy,
  extractTagsFromDocument,
} from './lib/federation-tag-extraction';
import { extractMetadata, mergeMetadata } from './lib/metadata-extraction';
import { SetMap } from './lib/setmap';
import type {
  ComposeAndValidateInput,
  ComposeAndValidateOutput,
  ExternalComposition,
  Metadata,
  SchemaType,
} from './types';

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

type CompositionErrorType = {
  message: string;
  source: 'composition' | 'graphql';
};

type ContractResultType = {
  id: string;
  result:
    | {
        type: 'success';
        result: {
          supergraph: string;
          sdl: string;
        };
      }
    | {
        type: 'failure';
        result: {
          supergraph?: string;
          sdl?: string;
          errors: Array<CompositionErrorType>;
        };
      };
};

type CompositionResultSuccess = {
  type: 'success';
  result: {
    supergraph: string;
    sdl: string;
    contracts?: Array<ContractResultType>;
  };
};

type CompositionResultFailure = {
  type: 'failure';
  result: {
    supergraph?: string;
    sdl?: string;
    errors: Array<CompositionErrorType>;
    contracts?: Array<ContractResultType>;
  };
};

type CompositionResult = CompositionResultSuccess | CompositionResultFailure;

function trimDescriptions(doc: DocumentNode): DocumentNode {
  function trim<T extends ASTNode>(node: T): T {
    if (node && 'description' in node && node.description) {
      (node.description as any).value = node.description.value.trim();
    }

    return node;
  }

  return visit(doc, {
    SchemaDefinition: trim,
    ObjectTypeDefinition: trim,
    ObjectTypeExtension: trim,
    InterfaceTypeExtension: trim,
    UnionTypeExtension: trim,
    InputObjectTypeExtension: trim,
    EnumTypeExtension: trim,
    SchemaExtension: trim,
    ScalarTypeExtension: trim,
    FieldDefinition: trim,
    InputValueDefinition: trim,
    InterfaceTypeDefinition: trim,
    UnionTypeDefinition: trim,
    EnumTypeDefinition: trim,
    EnumValueDefinition: trim,
    InputObjectTypeDefinition: trim,
    DirectiveDefinition: trim,
  });
}

interface Orchestrator {
  composeAndValidate(
    input: ComposeAndValidateInput,
    external: ExternalComposition,
    native: boolean,
    contracts?: ContractsInputType,
  ): Promise<ComposeAndValidateOutput>;
}

const createFederation: (
  cache: Cache,
  logger: ServiceLogger,
  requestId: string,
  decrypt: (value: string) => string,
) => Orchestrator = (cache, logger, requestId, decrypt) => {
  const compose = cache.reuse<
    {
      schemas: ComposeAndValidateInput;
      external: ExternalComposition;
      native: boolean;
      contracts: ContractsInputType | undefined;
    },
    CompositionResult & {
      includesNetworkError: boolean;
      includesException?: boolean;
      tags: Array<string> | null;
      schemaMetadata: Record<string, Metadata[]> | null;
      metadataAttributes: Record<string, string[]> | null;
    }
  >(
    'federation',
    async ({ schemas, external, native, contracts }) => {
      const subgraphs = schemas
        .map(schema => {
          logger.debug(`Parsing subgraph schema SDL (name=%s)`, schema.source);
          return {
            typeDefs: trimDescriptions(parse(schema.raw)),
            name: schema.source,
            url: 'url' in schema && typeof schema.url === 'string' ? schema.url : undefined,
          };
        })
        .map(subgraph => {
          logger.debug(`Extracting link implementations from subgraph (name=%s)`, subgraph.name);
          const { matchesImplementation, resolveImportName } = extractLinkImplementations(
            subgraph.typeDefs,
          );
          if (matchesImplementation('https://specs.graphql-hive.com/hive', 'v1.0')) {
            logger.debug(
              `Found hive link in subgraph. Applying link logic. (name=%s)`,
              subgraph.name,
            );
            // if this subgraph implements the metadata spec
            // then copy metadata from the schema to all fields.
            // @note this is similar to how federation's compose copies join__ directives to fields based on the
            // subgraph that the field is a part of.
            const metaDirectiveName = resolveImportName(
              'https://specs.graphql-hive.com/hive',
              '@meta',
            );
            const applyMetaToField = (
              fieldNode: FieldDefinitionNode,
              metaDirectives: ConstDirectiveNode[],
            ) => {
              return {
                ...fieldNode,
                directives: [
                  ...(fieldNode.directives ?? []),
                  ...metaDirectives.map(d => ({ ...d, loc: undefined })),
                ],
              };
            };

            const schemaNodes = subgraph.typeDefs.definitions.filter(
              d => d.kind === Kind.SCHEMA_DEFINITION || d.kind === Kind.SCHEMA_EXTENSION,
            );
            const schemaMetaDirectives = schemaNodes
              .flatMap(node => node.directives?.filter(d => d.name.value === metaDirectiveName))
              .filter(d => d !== undefined);
            const interfaceAndObjectHandler = (node: {
              readonly fields?: ReadonlyArray<FieldDefinitionNode> | undefined;
              readonly directives?: ReadonlyArray<ConstDirectiveNode> | undefined;
              readonly name: NameNode;
            }) => {
              // apply type/interface metadata to fields
              const objectMetaDirectives = node.directives
                ?.filter(d => d.name.value === metaDirectiveName)
                .filter(d => d !== undefined);
              if (objectMetaDirectives?.length) {
                return {
                  ...node,
                  fields: node.fields?.map(f => applyMetaToField(f, objectMetaDirectives)),
                };
              }
              return node;
            };
            subgraph.typeDefs = visit(subgraph.typeDefs, {
              FieldDefinition: field => {
                return applyMetaToField(field, schemaMetaDirectives);
              },
              ObjectTypeDefinition: interfaceAndObjectHandler,
              InterfaceTypeDefinition: interfaceAndObjectHandler,
            });
          }
          return subgraph;
        });

      /** Determine the correct compose method... */
      let compose: (subgraphs: Array<SubgraphInput>) => Promise<ComposerMethodResult>;

      // Federation v2
      if (native) {
        logger.debug(
          'Using built-in Federation v2 composition service (schemas=%s)',
          schemas.length,
        );
        compose = subgraphs => Promise.resolve(composeFederationV2(subgraphs, logger));
      } else if (external) {
        compose = subgraphs =>
          composeExternalFederation({
            cache,
            decrypt,
            external,
            logger,
            requestId,
            subgraphs,
          });
      } else {
        logger.debug(
          'Using built-in Federation v1 composition service (schemas=%s)',
          schemas.length,
        );
        compose = subgraphs => Promise.resolve(composeFederationV1(subgraphs));
      }
      let result: CompositionResult & {
        includesNetworkError: boolean;
        tags: Array<string> | null;
        /** Metadata stored by coordinate and then by subgraph */
        schemaMetadata: Record<string, Metadata[]> | null;
        metadataAttributes: Record<string, string[]> | null;
      };

      {
        const composed: CompositionResult & {
          includesNetworkError: boolean;
          includesException?: boolean;
        } = await compose(subgraphs);

        if (composed.type === 'success') {
          // merge all metadata from every subgraph by coordinate
          const subgraphsMetadata = subgraphs.map(({ name, typeDefs }) =>
            extractMetadata(typeDefs, name),
          );
          const supergraphSDL = parse(composed.result.supergraph);
          const { resolveImportName } = extractLinkImplementations(supergraphSDL);
          const tagDirectiveName = resolveImportName('https://specs.apollo.dev/tag', '@tag');
          const tagStrategy = createTagDirectiveNameExtractionStrategy(tagDirectiveName);
          const tags = extractTagsFromDocument(supergraphSDL, tagStrategy);
          const schemaMetadata = mergeMetadata(...subgraphsMetadata);
          const metadataAttributes = new SetMap<string, string>();
          for (const [_coord, attrs] of schemaMetadata) {
            for (const attr of attrs) {
              metadataAttributes.add(attr.name, attr.content);
            }
          }
          result = {
            ...composed,
            tags,
            schemaMetadata: Object.fromEntries(schemaMetadata),
            metadataAttributes: metadataAttributes.toObject(),
          };
        } else {
          result = {
            ...composed,
            tags: null,
            schemaMetadata: null,
            metadataAttributes: null,
          };
        }
      }

      if (!contracts?.length) {
        // if no contracts, then compose and return the result
        return result;
      }

      if (result.type == 'failure') {
        return {
          ...result,
          result: {
            ...result.result,
            contracts: contracts.map(contract => ({
              id: contract.id,
              result: {
                type: 'failure',
                result: {
                  errors: [
                    {
                      message: 'Skipped contract composition, as default graph composition failed.',
                      source: 'composition',
                    },
                  ],
                },
              },
            })),
          },
        };
      }

      // if there are contracts, then create
      const contractResults = await Promise.all(
        contracts.map(async contract => {
          // apply contracts to replace tags with inaccessible directives
          const filteredSubgraphs = applyTagFilterOnSubgraphs(subgraphs, {
            include: new Set(contract.filter.include),
            exclude: new Set(contract.filter.exclude),
          });

          // attempt to compose the contract filtered subgraph
          const compositionResult = await compose(filteredSubgraphs);

          // Remove unreachable types from public API schema
          if (
            contract.filter.removeUnreachableTypesFromPublicApiSchema === true &&
            compositionResult.type === 'success'
          ) {
            let supergraphSDL = parse(compositionResult.result.supergraph);
            const { resolveImportName } = extractLinkImplementations(supergraphSDL);
            return {
              id: contract.id,
              result: addInaccessibleToUnreachableTypes(
                resolveImportName,
                compositionResult,
                supergraphSDL,
              ),
            };
          }
          return {
            id: contract.id,
            result: compositionResult,
          };
        }),
      );

      const networkErrorContract = contractResults.find(
        contract => contract.result.includesNetworkError === true,
      );

      // In case any of the contract composition fails, we will fail the whole composition.
      if (networkErrorContract) {
        return {
          ...networkErrorContract.result,
          schemaMetadata: null,
          tags: null,
          metadataAttributes: null,
        };
      }

      return {
        ...result,
        result: {
          supergraph: result.result.supergraph,
          sdl: result.result.sdl,
          contracts: contractResults,
        },
      };
    },
    function pickCacheType(result) {
      return ('includesNetworkError' in result && result.includesNetworkError === true) ||
        ('includesException' in result && result.includesException === true)
        ? 'short'
        : 'long';
    },
  );

  return {
    async composeAndValidate(schemas, external, native, contracts) {
      try {
        const composed = await compose({ schemas, external, native, contracts });
        return {
          errors: composed.type === 'failure' ? composed.result.errors : [],
          sdl: composed.result.sdl ?? null,
          supergraph: composed.result.supergraph ?? null,
          includesNetworkError:
            composed.type === 'failure' && composed.includesNetworkError === true,
          contracts:
            composed.result.contracts?.map(contract => ({
              id: contract.id,
              errors: 'errors' in contract.result.result ? contract.result.result.errors : [],
              sdl: contract.result.result.sdl ?? null,
              supergraph: contract.result.result.supergraph ?? null,
            })) ?? null,
          tags: composed.tags ?? null,
          schemaMetadata: composed.schemaMetadata ?? null,
          metadataAttributes: composed.metadataAttributes ?? null,
        };
      } catch (error) {
        if (cache.isTimeoutError(error)) {
          return {
            errors: [
              {
                message: error.message,
                source: 'graphql',
              },
            ],
            sdl: null,
            supergraph: null,
            includesNetworkError: true,
            contracts: null,
            tags: null,
            schemaMetadata: null,
            metadataAttributes: null,
          };
        }

        throw error;
      }
    },
  };
};

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

function createSingle(): Orchestrator {
  return {
    async composeAndValidate(schemas) {
      const schema = schemas[0];
      let schemaAst = parse(schema.raw);

      // If the schema contains type system extension nodes, merge them into the schema.
      // We don't want to show many type extension of User, we want to show single User type.
      if (schemaAst.definitions.some(isTypeSystemExtensionNode)) {
        schemaAst = mergeTypeDefs(schemaAst);
      }
      const errors = validateSingleSDL(schemaAst);

      return {
        errors,
        sdl: print(trimDescriptions(schemaAst)),
        supergraph: null,
        contracts: null,
        tags: null,
        schemaMetadata: null,
        metadataAttributes: null,
      };
    },
  };
}

const createStitching: (cache: Cache) => Orchestrator = cache => {
  const stitchAndPrint = cache.reuse('stitching', async (schemas: string[]) => {
    return printSchema(
      stitchSchemas({
        subschemas: schemas.map(schema =>
          buildASTSchema(trimDescriptions(parse(schema)), {
            assumeValid: true,
            assumeValidSDL: true,
          }),
        ),
      }),
    );
  });

  return {
    async composeAndValidate(schemas) {
      const parsed = schemas.map(s => parse(s.raw));
      const errors = parsed.map(schema => validateStitchedSchema(schema)).flat();

      let sdl: string | null = null;
      try {
        sdl = await stitchAndPrint(schemas.map(s => s.raw));
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
    },
  };
};

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

export function pickOrchestrator(
  type: SchemaType,
  cache: Cache,
  req: FastifyRequest,
  decrypt: (value: string) => string,
) {
  switch (type) {
    case 'federation':
      return createFederation(
        cache,
        req.log,
        req.id ?? Math.random().toString(16).substring(2),
        decrypt,
      );
    case 'single':
      return createSingle();
    case 'stitching':
      return createStitching(cache);
    default:
      throw new Error(`Unknown schema type: ${type}`);
  }
}
