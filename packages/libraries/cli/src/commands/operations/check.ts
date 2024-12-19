import { buildSchema, GraphQLError, Source } from 'graphql';
import { InvalidDocument, validate } from '@graphql-inspector/core';
import { Args, Flags, ux } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { loadOperations } from '../../helpers/operations';
import { tb } from '../../helpers/typebox/__';
import { SchemaOutput } from '../../schema-output/__';

const fetchLatestVersionQuery = graphql(/* GraphQL */ `
  query fetchLatestVersion {
    latestValidVersion {
      sdl
    }
  }
`);

export default class OperationsCheck extends Command<typeof OperationsCheck> {
  static description = 'checks operations against a published schema';
  static descriptionFragmentForAction = 'validate operations';
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
  static output = SchemaOutput.output(
    SchemaOutput.success({
      __typename: tb.Literal('CLIOperationsCheckNoneFound'),
    }),
    SchemaOutput.failure({
      __typename: tb.Literal('CLIOperationsCheckNoSchemaFound'),
    }),
    SchemaOutput.success({
      __typename: tb.Literal('CLIOperationsCheckResult'),
      countTotal: tb.Integer({ minimum: 0 }),
      countInvalid: tb.Integer({ minimum: 0 }),
      countValid: tb.Integer({ minimum: 0 }),
      invalidOperations: tb.Array(
        tb.Object({
          source: tb.Object({
            name: tb.String(),
          }),
          errors: tb.Array(
            tb.Object({
              message: tb.String(),
              locations: tb.Array(
                tb.Object({
                  line: tb.Integer({ minimum: 0 }),
                  column: tb.Integer({ minimum: 0 }),
                }),
              ),
            }),
          ),
        }),
      ),
    }),
  );

  async runResult() {
    const { flags, args } = await this.parse(OperationsCheck);

    await this.require(flags);

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
    });
    const graphqlTag = flags.graphqlTag;
    const globalGraphqlTag = flags.globalGraphqlTag;

    const file: string = args.file;

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

    if (operations.length === 0) {
      const message = 'No operations found';
      this.logInfo(message);
      return this.successEnvelope({
        message,
        data: {
          __typename: 'CLIOperationsCheckNoneFound',
        },
      });
    }

    const result = await this.registryApi(endpoint, accessToken)
      .request({
        operation: fetchLatestVersionQuery,
      })
      .then(_ => _.latestValidVersion);

    const sdl = result?.sdl;

    if (!sdl) {
      return this.failureEnvelope({
        message: 'Could not find a published schema.',
        suggestions: ['Publish a valid schema first.'],
        data: {
          __typename: 'CLIOperationsCheckNoSchemaFound',
        },
      });
    }

    const schema = buildSchema(sdl, {
      assumeValidSDL: true,
      assumeValid: true,
    });

    if (!flags.apolloClient) {
      const detectedApolloDirectives = operations.some(
        s => s.content.includes('@client') || s.content.includes('@connection'),
      );

      if (detectedApolloDirectives) {
        // TODO: Gather warnings into a "warnings" array property in our envelope.
        this.warn(
          'Apollo Client specific directives detected (@client, @connection). Please use the --apolloClient flag to enable support.',
        );
      }
    }

    const invalidOperations = validate(
      schema,
      operations.map(s => new Source(s.content, s.location)),
      {
        apollo: flags.apolloClient === true,
      },
    );

    const operationsWithErrors = invalidOperations.filter(o => o.errors.length > 0);

    if (operationsWithErrors.length === 0) {
      this.logSuccess(`All operations are valid (${operations.length})`);
    } else {
      ux.styledHeader('Summary');
      this.log(
        [
          `Total: ${operations.length}`,
          `Invalid: ${operationsWithErrors.length} (${Math.floor(
            (operationsWithErrors.length / operations.length) * 100,
          )}%)`,
          '',
        ].join('\n'),
      );

      ux.styledHeader('Details');

      this.printInvalidDocuments(operationsWithErrors);
      process.exitCode = 1;
    }

    return this.success({
      __typename: 'CLIOperationsCheckResult',
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
    });
  }

  private printInvalidDocuments(invalidDocuments: InvalidDocument[]): void {
    invalidDocuments.forEach(doc => {
      this.renderErrors(doc.source.name, doc.errors);
    });
  }

  private renderErrors(sourceName: string, errors: GraphQLError[]) {
    this.logFailure(sourceName);
    errors.forEach(e => {
      this.log(` - ${this.bolderize(e.message)}`);
    });
    this.log('');
  }
}
