import { writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { Args, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { ACCESS_TOKEN_MISSING } from '../../helpers/errors';
import { Texture } from '../../helpers/texture/texture';

const SchemaVersionForActionIdQuery = graphql(/* GraphQL */ `
  query SchemaVersionForActionId(
    $actionId: ID!
    $includeSDL: Boolean!
    $includeSupergraph: Boolean!
    $includeSubgraphs: Boolean!
  ) {
    schemaVersionForActionId(actionId: $actionId) {
      id
      valid
      sdl @include(if: $includeSDL)
      supergraph @include(if: $includeSupergraph)
      schemas @include(if: $includeSubgraphs) {
        nodes {
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
        total
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
  };

  static args = {
    actionId: Args.string({
      name: 'actionId' as const,
      required: true,
      description: 'action id (e.g. commit sha)',
      hidden: false,
    }),
  };

  async run() {
    const { flags, args } = await this.parse(SchemaFetch);

    const endpoint = this.ensure({
      key: 'registry.endpoint',
      args: flags,
      env: 'HIVE_REGISTRY',
      legacyFlagName: 'registry',
      defaultValue: graphqlEndpoint,
    });

    const accessToken = this.ensure({
      key: 'registry.accessToken',
      args: flags,
      legacyFlagName: 'token',
      env: 'HIVE_TOKEN',
      message: ACCESS_TOKEN_MISSING,
    });

    const actionId: string = args.actionId;

    const sdlType = this.ensure({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      key: 'type',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      args: flags,
      defaultValue: 'sdl',
    });

    const result = await this.registryApi(endpoint, accessToken).request({
      operation: SchemaVersionForActionIdQuery,
      variables: {
        actionId,
        includeSDL: sdlType === 'sdl',
        includeSupergraph: sdlType === 'supergraph',
        includeSubgraphs: sdlType === 'subgraphs',
      },
    });

    if (result.schemaVersionForActionId == null) {
      return this.error(`No schema found for action id ${actionId}`);
    }

    if (result.schemaVersionForActionId.valid === false) {
      return this.error(`Schema is invalid for action id ${actionId}`);
    }

    if (result.schemaVersionForActionId?.schemas) {
      const { total, nodes } = result.schemaVersionForActionId.schemas;
      const tableData = [
        ['service', 'url', 'date'],
        ...nodes.map(node => [
          /** @ts-expect-error: If service is undefined then use id. */
          node.service ?? node.id,
          node.__typename === 'CompositeSchema' ? node.url : 'n/a',
          node.date as string,
        ]),
      ];
      const stats = `subgraphs length: ${total}`;
      const printed = `${Texture.table(tableData)}\n\r${stats}`;

      if (flags.write) {
        const filepath = resolve(process.cwd(), flags.write);
        await writeFile(filepath, printed, 'utf8');
      }
      this.log(printed);
    } else {
      const schema =
        result.schemaVersionForActionId.sdl ?? result.schemaVersionForActionId.supergraph;

      if (schema == null) {
        return this.error(`No ${sdlType} found for action id ${actionId}`);
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
            this.logFailure(`Unsupported file extension ${extname(flags.write)}`);
            this.exit(1);
        }
        return;
      }
      this.log(schema);
    }
  }
}
