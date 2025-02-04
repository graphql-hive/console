import { buildSchema, Source } from 'graphql';
import { validate } from '@graphql-inspector/core';
import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import * as GraphQLSchema from '../../gql/graphql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  InvalidDocumentsError,
  InvalidTargetError,
  MissingEndpointError,
  MissingRegistryTokenError,
  SchemaNotFoundError,
  UnexpectedError,
} from '../../helpers/errors';
import { loadOperations } from '../../helpers/operations';
import * as TargetInput from '../../helpers/target-input';
import { Texture } from '../../helpers/texture/texture';

const fetchLatestVersionQuery = graphql(/* GraphQL */ `
  query fetchLatestVersion($target: TargetReferenceInput) {
    latestValidVersion(target: $target) {
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
    target: Flags.string({
      description:
        'The target to which to check agains (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
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

  async run() {
    try {
      const { flags, args } = await this.parse(OperationsCheck);

      await this.require(flags);
      let accessToken: string, endpoint: string;

      try {
        endpoint = this.ensure({
          key: 'registry.endpoint',
          args: flags,
          legacyFlagName: 'registry',
          defaultValue: graphqlEndpoint,
          env: 'HIVE_REGISTRY',
          description: OperationsCheck.flags['registry.endpoint'].description!,
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
          description: OperationsCheck.flags['registry.accessToken'].description!,
        });
      } catch (e) {
        throw new MissingRegistryTokenError();
      }

      let target: GraphQLSchema.TargetReferenceInput | null = null;
      if (flags.target) {
        const result = TargetInput.parse(flags.target);
        if (result.type === 'error') {
          throw new InvalidTargetError();
        }
        target = result.data;
      }

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
        this.logInfo('No operations found');
        this.exit(0);
        return;
      }

      const result = await this.registryApi(endpoint, accessToken).request({
        operation: fetchLatestVersionQuery,
        variables: { target },
      });

      const sdl = result.latestValidVersion?.sdl;

      if (!sdl) {
        throw new SchemaNotFoundError();
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
        this.exit(0);
        return;
      }

      this.log(Texture.header('Summary'));
      this.log(
        [
          `Total: ${operations.length}`,
          `Invalid: ${operationsWithErrors.length} (${Math.floor(
            (operationsWithErrors.length / operations.length) * 100,
          )}%)`,
          '',
        ].join('\n'),
      );

      this.log(Texture.header('Details'));

      throw new InvalidDocumentsError(operationsWithErrors);
    } catch (error) {
      if (error instanceof Errors.CLIError) {
        throw error;
      } else {
        this.logFailure('Failed to validate operations');
        throw new UnexpectedError(error);
      }
    }
  }
}
