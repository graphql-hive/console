import { buildSchema, Source } from 'graphql';
import { validate } from '@graphql-inspector/core';
import { Args, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { ACCESS_TOKEN_MISSING } from '../../helpers/errors';
import { loadOperations } from '../../helpers/operations';
import { Texture } from '../../helpers/texture/texture';
import { T } from '../../helpers/typebox/__';
import { Output } from '../../output/__';

const fetchLatestVersionQuery = graphql(/* GraphQL */ `
  query fetchLatestVersion {
    latestValidVersion {
      sdl
    }
  }
`);

export default class OperationsCheck extends Command<typeof OperationsCheck> {
  static description = 'checks operations against a published schema';
  static flags = {
    'registry.endpoint': Flags.string({
      description: 'registry endpoint',
    }),
    /** @deprecated */
    registry: Flags.string({
      description: 'registry address',
      deprecated: {
        message: 'use --registry.endpoint instead',
        version: '0.21.0',
      },
    }),
    'registry.accessToken': Flags.string({
      description: 'registry access token',
    }),
    /** @deprecated */
    token: Flags.string({
      description: 'api token',
      deprecated: {
        message: 'use --registry.accessToken instead',
        version: '0.21.0',
      },
    }),
    require: Flags.string({
      description: 'Loads specific require.extensions before running the command',
      default: [],
      multiple: true,
    }),
    graphqlTag: Flags.string({
      description: [
        'Identify template literals containing GraphQL queries in JavaScript/TypeScript code. Supports multiple values.',
        'Examples:',
        '  --graphqlTag graphql-tag (Equivalent to: import gqlTagFunction from "graphql-tag")',
        '  --graphqlTag graphql:react-relay (Equivalent to: import { graphql } from "react-relay")',
      ].join('\n'),
      multiple: true,
    }),
    globalGraphqlTag: Flags.string({
      description: [
        'Allows to use a global identifier instead of a module import. Similar to --graphqlTag.',
        'Examples:',
        '  --globalGraphqlTag gql (Supports: export const meQuery = gql`{ me { id } }`)',
        '  --globalGraphqlTag graphql (Supports: export const meQuery = graphql`{ me { id } }`)',
      ].join('\n'),
      multiple: true,
    }),
    apolloClient: Flags.boolean({
      description: 'Supports Apollo Client specific directives',
      default: false,
    }),
  };
  static args = {
    file: Args.string({
      name: 'file',
      required: true,
      description: 'Glob pattern to find the operations',
      hidden: false,
    }),
  };
  static output = [
    Output.defineFailure('FailureOperationsCheckNoSchemaFound', {
      data: {},
      text: (_, __, t) => t.failure('Could not find a published schema.'),
    }),
    Output.defineSuccess('SuccessOperationsCheckNoOperationsFound', {
      data: {},
      text: (_, __, t) => t.info('No operations found'),
    }),
    Output.defineSuccess('SuccessOperationsCheck', {
      data: {
        countTotal: T.Integer({ minimum: 0 }),
        countInvalid: T.Integer({ minimum: 0 }),
        countValid: T.Integer({ minimum: 0 }),
        invalidOperations: T.Array(
          T.Object({
            source: T.Object({
              name: T.String(),
            }),
            errors: T.Array(
              T.Object({
                message: T.String(),
                locations: T.Array(
                  T.Object({
                    line: T.Integer({ minimum: 0 }),
                    column: T.Integer({ minimum: 0 }),
                  }),
                ),
              }),
            ),
          }),
        ),
      },
      text(_, data, t) {
        if (data.invalidOperations.length === 0) {
          t.success(`All operations are valid (${data.countTotal})`);
        } else {
          t.header('Summary');
          t.line(`Total: ${data.countTotal}`);
          t.line(`Invalid: ${data.countInvalid} (${Math.floor((data.countInvalid / data.countTotal) * 100)}%)`); // prettier-ignore
          t.line('');
          t.header('Details');
          data.invalidOperations.forEach(doc => {
            t.failure(doc.source.name);
            doc.errors.forEach(e => {
              t.line(` - ${Texture.boldQuotedWords(e.message)}`);
            });
            t.line('');
          });
        }
      },
    }),
  ];

  async runResult() {
    const { flags, args } = await this.parse(OperationsCheck);

    await this.require(flags);

    const file = args.file;
    const endpoint = this.ensure({
      key: 'registry.endpoint',
      args: flags,
      legacyFlagName: 'registry',
      defaultValue: graphqlEndpoint,
      env: 'HIVE_REGISTRY',
    });
    const accessToken = this.ensure({
      key: 'registry.accessToken',
      args: flags,
      legacyFlagName: 'token',
      env: 'HIVE_TOKEN',
      message: ACCESS_TOKEN_MISSING,
    });
    const graphqlTag = flags.graphqlTag;
    const globalGraphqlTag = flags.globalGraphqlTag;

    const operations = await loadOperations(file, {
      normalize: false,
      pluckModules: graphqlTag?.map(tag => {
        const [name, identifier] = tag.split(':');
        return {
          name,
          identifier,
        };
      }),
      pluckGlobalGqlIdentifierName: globalGraphqlTag,
    });
    const isHasApolloDirectives = operations.some(
      _ => _.content.includes('@client') || _.content.includes('@connection'),
    );

    if (operations.length === 0) {
      return this.success({
        type: 'SuccessOperationsCheckNoOperationsFound',
      });
    }

    const sdl = await this.registryApi(endpoint, accessToken)
      .request({ operation: fetchLatestVersionQuery })
      .then(_ => _.latestValidVersion?.sdl);

    if (!sdl) {
      return this.failureEnvelope({
        suggestions: ['Publish a valid schema first.'],
        data: {
          type: 'FailureOperationsCheckNoSchemaFound',
        },
      });
    }

    const schema = buildSchema(sdl, {
      assumeValidSDL: true,
      assumeValid: true,
    });

    const invalidOperations = validate(
      schema,
      operations.map(_ => new Source(_.content, _.location)),
      {
        apollo: flags.apolloClient === true,
      },
    );

    const operationsWithErrors = invalidOperations.filter(o => o.errors.length > 0);
    return this.successEnvelope({
      exitCode: operationsWithErrors.length > 0 ? 1 : 0,
      warnings:
        !flags.apolloClient && isHasApolloDirectives
          ? [
              'Apollo Client specific directives detected (@client, @connection). Please use the --apolloClient flag to enable support.',
            ]
          : [],
      data: {
        type: 'SuccessOperationsCheck',
        countTotal: operations.length,
        countInvalid: operationsWithErrors.length,
        countValid: operations.length - operationsWithErrors.length,
        invalidOperations: operationsWithErrors.map(o => {
          return {
            source: {
              name: o.source.name,
            },
            errors: o.errors.map(e => {
              return {
                message: e.message,
                locations:
                  e.locations?.map(l => {
                    return {
                      line: l.line,
                      column: l.column,
                    };
                  }) ?? [],
              };
            }),
          };
        }),
      },
    });
  }
}
