import { writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { Args, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { ACCESS_TOKEN_MISSING } from '../../helpers/errors';
import { OClif } from '../../helpers/oclif';
import { printTable } from '../../helpers/texture/print-table';
import { T } from '../../helpers/typebox/__';
import { OutputDefinitions } from '../../output-definitions';
import { Output } from '../../output/__';

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

const Graph = T.Union([
  T.Object({
    type: T.Literal('SingleSchema'),
    id: T.String(),
    date: T.String(),
  }),
  T.Object({
    type: T.Literal('CompositeSchema'),
    id: T.String(),
    date: T.String(),
    service: T.Nullable(T.String()),
    url: T.Nullable(T.String()),
  }),
]);

const SuccessSchemas = Output.defineSuccess('SuccessSchemas', {
  data: {
    subGraphs: T.Array(Graph),
  },
  text(_, data, t) {
    const table = [
      ['service', 'url', 'date'],
      ...data.subGraphs.map(subGraph =>
        subGraph.type === 'CompositeSchema'
          ? [subGraph.service ?? subGraph.id, subGraph.url ?? 'n/a', subGraph.date]
          : [subGraph.id, 'n/a', subGraph.date],
      ),
    ];
    t.line(printTable(table));
    t.line(`subgraphs length: ${data.subGraphs.length}`);
  },
});

type Graph = T.Static<typeof Graph>;
type SuccessSchemas = Output.InferSuccessResult<typeof SuccessSchemas>;

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
  static output = [
    Output.defineFailure('FailureSchemaFetchMissingSchema', {
      data: {},
      text({ args }: OClif.InferInput<typeof SchemaFetch>, _, t) {
        t.failure(`No schema found for action id ${args.actionId}`);
      },
    }),
    Output.defineFailure('FailureSchemaFetchInvalidSchema', {
      data: {},
      text({ args }: OClif.InferInput<typeof SchemaFetch>, _, t) {
        t.failure(`Schema is invalid for action id ${args.actionId}`);
      },
    }),
    Output.defineFailure('FailureSchemaFetchMissingSDLType', {
      data: {},
      text({ args, flags }: OClif.InferInput<typeof SchemaFetch>, _, t) {
        t.failure(`No ${flags.type} found for action id ${args.actionId}`);
      },
    }),
    Output.defineFailure('FailureInputWriteFileExtension', {
      data: {
        extension: T.String(),
      },
      text(_, data, t) {
        t.failure(`Unsupported file extension ${data.extension}`);
      },
    }),
    SuccessSchemas,
    OutputDefinitions.SuccessOutputFile,
    OutputDefinitions.SuccessOutputStdout,
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
          includeSubgraphs: sdlType === 'subgraphs',
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

    /**
     * TODO Seems wrong
     *
     * If one schema then we output the content either to stdout OR a file if --write. Clear.
     *
     * But: If multiple schemas returned we output an ASCII table of data to stdout AND a file if --write.
     *
     * 1. Why inconsistency between schema content vs tabular data
     * 2. Why inconsistency between "stdout OR file" vs "stdout AND file"
     *
     * Aside from confusing UX ir also leads to confusing output code below (we need to reach for the output
     * text formatter for the write side effect)
     */
    if (result.schemas) {
      const data: SuccessSchemas['data'] = {
        type: 'SuccessSchemas',
        subGraphs: result.schemas.nodes.map(
          (_): Graph =>
            _.__typename === 'SingleSchema'
              ? {
                  type: _.__typename,
                  id: _.id,
                  date: String(_.date),
                }
              : {
                  type: _.__typename,
                  id: _.id,
                  service: _.service ?? null,
                  url: _.url ?? null,
                  date: String(_.date),
                },
        ),
      };
      const text = Output.runText(SuccessSchemas, { flags, args }, data);

      if (flags.write) {
        const filepath = resolve(process.cwd(), flags.write);
        await writeFile(filepath, text, 'utf8');
      }

      return this.success(data);
    }

    const schema = result.sdl ?? result.supergraph;

    if (schema == null) {
      return this.failure({
        type: 'FailureSchemaFetchMissingSDLType',
      });
    }

    if (flags.write) {
      const validExtensions = ['.graphql', '.gql', '.gqls', '.graphqls'];
      const filepath = resolve(process.cwd(), flags.write);
      const extension = extname(flags.write.toLowerCase());
      if (!validExtensions.includes(extension)) {
        return this.failure({
          type: 'FailureInputWriteFileExtension',
          extension,
        });
      }
      await writeFile(filepath, schema, 'utf8');
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
