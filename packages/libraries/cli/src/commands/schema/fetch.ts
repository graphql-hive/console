import { writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { Args, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import * as GraphQLSchema from '../../gql/graphql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  InvalidSchemaError,
  InvalidTargetError,
  MissingEndpointError,
  MissingRegistryTokenError,
  SchemaNotFoundError,
  UnsupportedFileExtensionError,
} from '../../helpers/errors';
import * as TargetInput from '../../helpers/target-input';
import { Texture } from '../../helpers/texture/texture';

const SchemaVersionForActionIdQuery = graphql(/* GraphQL */ `
  query SchemaVersionForActionId(
    $actionId: ID!
    $includeSDL: Boolean!
    $includeSupergraph: Boolean!
    $includeSubgraphs: Boolean!
    $target: TargetReferenceInput
  ) {
    schemaVersionForActionId(actionId: $actionId, target: $target) {
      id
      valid
      sdl @include(if: $includeSDL)
      supergraph @include(if: $includeSupergraph)
      schemas @include(if: $includeSubgraphs) {
        edges {
          node {
            __typename
            ... on SingleSchema {
              id
              date
            }
            ... on CompositeSchema {
              id
              date
              url
              service
            }
          }
        }
      }
    }
  }
`);

const LatestSchemaVersionQuery = graphql(/* GraphQL */ `
  query LatestSchemaVersion(
    $includeSDL: Boolean!
    $includeSupergraph: Boolean!
    $includeSubgraphs: Boolean!
    $target: TargetReferenceInput
  ) {
    latestValidVersion(target: $target) {
      id
      valid
      sdl @include(if: $includeSDL)
      supergraph @include(if: $includeSupergraph)
      schemas @include(if: $includeSubgraphs) {
        edges {
          node {
            __typename
            ... on SingleSchema {
              id
              date
            }
            ... on CompositeSchema {
              id
              date
              url
              service
            }
          }
        }
      }
    }
  }
`);

export default class SchemaFetch extends Command<typeof SchemaFetch> {
  static description = 'fetch a schema, supergraph, or list of subgraphs from the Hive API';
  static flags = {
    /** @deprecated */
    registry: Flags.string({
      description: 'registry address',
      deprecated: {
        message: 'use --registry.endpoint instead',
        version: '0.21.0',
      },
    }),
    /** @deprecated */
    token: Flags.string({
      description: 'api token',
      deprecated: {
        message: 'use --registry.accessToken instead',
        version: '0.21.0',
      },
    }),
    'registry.endpoint': Flags.string({
      description: 'registry endpoint',
    }),
    'registry.accessToken': Flags.string({
      description: 'registry access token',
    }),
    type: Flags.string({
      aliases: ['T'],
      description: 'Type to fetch (possible types: sdl, supergraph, subgraphs)',
    }),
    write: Flags.string({
      aliases: ['W'],
      description: 'Write to a file (possible extensions: .graphql, .gql, .gqls, .graphqls)',
    }),
    outputFile: Flags.string({
      description: 'whether to write to a file instead of stdout',
    }),
    target: Flags.string({
      description:
        'The target from which to fetch the schema (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
  };

  static args = {
    actionId: Args.string({
      name: 'actionId' as const,
      description: 'action id (e.g. commit sha)',
      hidden: false,
    }),
  };

  async run() {
    const { flags, args } = await this.parse(SchemaFetch);

    let endpoint: string, accessToken: string;
    try {
      endpoint = this.ensure({
        key: 'registry.endpoint',
        args: flags,
        env: 'HIVE_REGISTRY',
        legacyFlagName: 'registry',
        defaultValue: graphqlEndpoint,
        description: SchemaFetch.flags['registry.endpoint'].description!,
      });
    } catch (e) {
      throw new MissingEndpointError();
    }
    try {
      accessToken = this.ensure({
        key: 'registry.accessToken',
        args: flags,
        legacyFlagName: 'token',
        env: 'HIVE_TOKEN',
        description: SchemaFetch.flags['registry.accessToken'].description!,
      });
    } catch (e) {
      throw new MissingRegistryTokenError();
    }

    const { actionId } = args;

    const sdlType = this.ensure({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      key: 'type',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      args: flags,
      defaultValue: 'sdl',
    });

    let target: GraphQLSchema.TargetReferenceInput | null = null;
    if (flags.target) {
      const result = TargetInput.parse(flags.target);
      if (result.type === 'error') {
        throw new InvalidTargetError();
      }
      target = result.data;
    }

    let schemaVersion;
    if (actionId) {
      const result = await this.registryApi(endpoint, accessToken).request({
        operation: SchemaVersionForActionIdQuery,
        variables: {
          actionId,
          includeSDL: sdlType === 'sdl',
          includeSupergraph: sdlType === 'supergraph',
          includeSubgraphs: sdlType === 'subgraphs',
          target,
        },
      });
      schemaVersion = result.schemaVersionForActionId;
    } else {
      const result = await this.registryApi(endpoint, accessToken).request({
        operation: LatestSchemaVersionQuery,
        variables: {
          includeSDL: sdlType === 'sdl',
          includeSupergraph: sdlType === 'supergraph',
          includeSubgraphs: sdlType === 'subgraphs',
          target,
        },
      });
      schemaVersion = result.latestValidVersion;
    }

    if (schemaVersion == null) {
      throw new SchemaNotFoundError(actionId);
    }

    if (schemaVersion.valid === false) {
      throw new InvalidSchemaError(actionId);
    }

    if (schemaVersion.schemas) {
      const tableData = [
        ['service', 'url', 'date'],
        ...schemaVersion.schemas.edges.map(edge => [
          'service' in edge.node && edge.node.service != null ? edge.node.service : edge.node.id,
          'url' in edge.node && edge.node.url != null ? edge.node.url : 'n/a',
          edge.node.date as string,
        ]),
      ];
      const stats = `subgraphs length: ${schemaVersion.schemas.edges.length}`;
      const printed = `${Texture.table(tableData)}\n\r${stats}`;

      if (flags.write) {
        const filepath = resolve(process.cwd(), flags.write);
        await writeFile(filepath, printed, 'utf8');
      }
      this.log(printed);
    } else {
      const schema = schemaVersion.sdl ?? schemaVersion.supergraph;

      if (schema == null) {
        throw new SchemaNotFoundError(actionId);
      }

      if (flags.write) {
        const filepath = resolve(process.cwd(), flags.write);
        switch (extname(flags.write.toLowerCase())) {
          case '.graphql':
          case '.gql':
          case '.gqls':
          case '.graphqls':
            await writeFile(filepath, schema, 'utf8');
            break;
          default:
            throw new UnsupportedFileExtensionError(flags.write, [
              '.graphql',
              '.gql',
              '.gqls',
              '.graphqls',
            ]);
        }
        return;
      }
      this.log(schema);
    }
  }
}
