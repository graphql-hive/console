import {
  Kind,
  parse,
  visit,
  type ConstDirectiveNode,
  type FieldDefinitionNode,
  type NameNode,
} from 'graphql';
import type { ServiceLogger } from '@hive/service-common';
import { extractLinkImplementations } from '@theguild/federation-composition';
import type { ContractsInputType } from '../api';
import { addInaccessibleToUnreachableTypes } from '../lib/add-inaccessible-to-unreachable-types';
import {
  composeExternalFederation,
  composeFederationV1,
  composeFederationV2,
  ComposerMethodResult,
  SubgraphInput,
} from '../lib/compose';
import {
  applyTagFilterOnSubgraphs,
  createTagDirectiveNameExtractionStrategy,
  extractTagsFromDocument,
} from '../lib/federation-tag-extraction';
import { extractMetadata, mergeMetadata } from '../lib/metadata-extraction';
import { SetMap } from '../lib/setmap';
import { trimDescriptions } from '../lib/trim-descriptions';
import type { ComposeAndValidateInput, ExternalComposition } from '../types';
import {
  CompositionResult,
  ContractResultFailure,
  ContractResultSuccess,
  ContractResultType,
} from './shared';

export type ComposeFederationDeps = {
  logger?: ServiceLogger;
  decrypt: (value: string) => string;
  requestTimeoutMs: number;
};

export type ComposeFederationArgs = {
  schemas: ComposeAndValidateInput;
  external: ExternalComposition;
  native: boolean;
  contracts: ContractsInputType | undefined;
  requestId: string;
};

export const createComposeFederation = (deps: ComposeFederationDeps) =>
  async function composeFederation(args: ComposeFederationArgs): Promise<CompositionResult> {
    const subgraphs = args.schemas
      .map(schema => {
        deps.logger?.debug(`Parsing subgraph schema SDL (name=%s)`, schema.source);
        return {
          typeDefs: trimDescriptions(parse(schema.raw)),
          name: schema.source,
          url: 'url' in schema && typeof schema.url === 'string' ? schema.url : undefined,
        };
      })
      .map(subgraph => {
        deps.logger?.debug(
          `Extracting link implementations from subgraph (name=%s)`,
          subgraph.name,
        );
        const { matchesImplementation, resolveImportName } = extractLinkImplementations(
          subgraph.typeDefs,
        );
        if (matchesImplementation('https://specs.graphql-hive.com/hive', 'v1.0')) {
          deps.logger?.debug(
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
    let compose: (subgraphs: Array<SubgraphInput>) => Promise<
      ComposerMethodResult & {
        includesException?: boolean;
      }
    >;

    // Federation v2
    if (args.native) {
      deps.logger?.debug(
        'Using built-in Federation v2 composition service (schemas=%s)',
        args.schemas.length,
      );
      compose = subgraphs => Promise.resolve(composeFederationV2(subgraphs, deps.logger));
    } else if (args.external) {
      const { external } = args;
      compose = subgraphs =>
        composeExternalFederation({
          decrypt: deps.decrypt,
          external,
          logger: deps.logger,
          requestId: args.requestId,
          subgraphs,
          requestTimeoutMs: deps.requestTimeoutMs,
        });
    } else {
      deps.logger?.debug(
        'Using built-in Federation v1 composition service (schemas=%s)',
        args.schemas.length,
      );
      compose = subgraphs => Promise.resolve(composeFederationV1(subgraphs));
    }
    let result: CompositionResult;

    {
      const composed = await compose(subgraphs);

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
          type: 'success',
          result: {
            supergraph: composed.result.supergraph,
            sdl: composed.result.sdl,
            contracts: null,
            tags,
            schemaMetadata: Object.fromEntries(schemaMetadata),
            metadataAttributes: metadataAttributes.toObject(),
          },
        };
      } else {
        result = {
          type: 'failure',
          result: {
            supergraph: composed.result.supergraph ?? null,
            sdl: composed.result.sdl ?? null,
            errors: composed.result.errors,
            contracts: null,
            includesNetworkError: composed.includesNetworkError,
            includesException: composed.includesException ?? false,
            tags: null,
            schemaMetadata: null,
            metadataAttributes: null,
          },
        };
      }
    }

    if (!args.contracts?.length) {
      // if no contracts, then compose and return the result
      return result;
    }

    if (result.type == 'failure') {
      return {
        ...result,
        result: {
          ...result.result,
          contracts: args.contracts.map(contract => ({
            id: contract.id,
            result: {
              type: 'failure',
              result: {
                supergraph: null,
                sdl: null,
                includesNetworkError: false,
                includesException: false,
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
    const contractResults: Array<ContractResultType> = await Promise.all(
      args.contracts.map(async contract => {
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
          const result = addInaccessibleToUnreachableTypes(
            resolveImportName,
            compositionResult,
            supergraphSDL,
          );

          if (result.type === 'success') {
            return {
              id: contract.id,
              result: {
                type: 'success',
                result: {
                  supergraph: result.result.supergraph,
                  sdl: result.result.sdl,
                },
              },
            } satisfies ContractResultSuccess;
          }

          return {
            id: contract.id,
            result: {
              type: 'failure',
              result: {
                supergraph: null,
                sdl: null,
                errors: result.result.errors,
                includesNetworkError: false,
                includesException: false,
              },
            },
          } satisfies ContractResultFailure;
        }

        if (compositionResult.type === 'success') {
          return {
            id: contract.id,
            result: {
              type: 'success',
              result: {
                supergraph: compositionResult.result.supergraph,
                sdl: compositionResult.result.sdl,
              },
            },
          } satisfies ContractResultSuccess;
        }

        return {
          id: contract.id,
          result: {
            type: 'failure',
            result: {
              supergraph: null,
              sdl: null,
              errors: compositionResult.result.errors,
              includesNetworkError: compositionResult.includesNetworkError,
              includesException: compositionResult.includesException ?? false,
            },
          },
        } satisfies ContractResultFailure;
      }),
    );

    const networkErrorContract = contractResults.find(
      (contract): contract is ContractResultFailure =>
        contract.result.type === 'failure' && contract.result.result.includesNetworkError === true,
    );

    // In case any of the contract composition fails, we will fail the whole composition.
    if (networkErrorContract) {
      return {
        type: 'failure',
        result: {
          errors: networkErrorContract.result.result.errors,
          supergraph: null,
          sdl: null,
          tags: null,
          includesNetworkError: true,
          includesException: false,
          schemaMetadata: null,
          metadataAttributes: null,
          contracts: null,
        },
      };
    }

    return {
      ...result,
      result: {
        ...result.result,
        contracts: contractResults,
      },
    };
  };
