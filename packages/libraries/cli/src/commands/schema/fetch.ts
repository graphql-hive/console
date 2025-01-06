import { writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { Args, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { ACCESS_TOKEN_MISSING } from '../../helpers/errors';
import { InferInput } from '../../helpers/oclif';
import { Output } from '../../output/__';

const SchemaVersionForActionIdQuery = graphql(/* GraphQL */ `
  query SchemaVersionForActionId(
    $actionId: ID!
    $includeSDL: Boolean!
    $includeSupergraph: Boolean!
  ) {
    schemaVersionForActionId(actionId: $actionId) {
      id
      valid
      sdl @include(if: $includeSDL)
      supergraph @include(if: $includeSupergraph)
    }
  }
`);

export default class SchemaFetch extends Command<typeof SchemaFetch> {
  static description = 'fetch schema or supergraph from the Hive API';
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
      description: 'Type to fetch (possible types: sdl, supergraph)',
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
  static output = [
    Output.failure('FailureSchemaFetchMissingSchema', {
      data: {},
      text({ args }: InferInput<typeof SchemaFetch>, _, t) {
        t.failure(`No schema found for action id ${args.actionId}`);
      },
    }),
    Output.failure('FailureSchemaFetchInvalidSchema', {
      data: {},
      text({ args }: InferInput<typeof SchemaFetch>, _, t) {
        t.failure(`Schema is invalid for action id ${args.actionId}`);
      },
    }),
    Output.failure('FailureSchemaFetchMissingSDLType', {
      data: {},
      text({ args, flags }: InferInput<typeof SchemaFetch>, _, t) {
        t.failure(`No ${flags.type} found for action id ${args.actionId}`);
      },
    }),
    Output.SuccessOutputFile,
    Output.SuccessOutputStdout,
  ];

  async runResult() {
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

    const sdlType = this.ensure({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      key: 'type',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      args: flags,
      defaultValue: 'sdl',
    });

    const result = await this.registryApi(endpoint, accessToken)
      .request({
        operation: SchemaVersionForActionIdQuery,
        variables: {
          actionId: args.actionId,
          includeSDL: sdlType === 'sdl',
          includeSupergraph: sdlType === 'supergraph',
        },
      })
      .then(_ => _.schemaVersionForActionId);

    if (result == null) {
      return this.failure({
        type: 'FailureSchemaFetchMissingSchema',
      });
    }

    if (result.valid === false) {
      return this.failure({
        type: 'FailureSchemaFetchInvalidSchema',
      });
    }

    const schema = result.sdl ?? result.supergraph;

    if (schema == null) {
      return this.failure({
        type: 'FailureSchemaFetchMissingSDLType',
      });
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
      return this.success({
        type: 'SuccessOutputFile',
        path: filepath,
        bytes: schema.length,
      });
    }

    return this.success({
      type: 'SuccessOutputStdout',
      content: schema,
    });
  }
}
