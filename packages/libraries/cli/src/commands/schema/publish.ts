import { GraphQLError, print } from 'graphql';
import { transformCommentsToDescriptions } from '@graphql-tools/utils';
import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import { DocumentType, graphql } from '../../gql';
import * as GraphQLSchema from '../../gql/graphql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  APIError,
  GithubAuthorRequiredError,
  GithubCommitRequiredError,
  InvalidSDLError,
  InvalidTargetError,
  MissingEndpointError,
  MissingEnvironmentError,
  MissingRegistryTokenError,
  SchemaPublishFailedError,
  SchemaPublishMissingServiceError,
  SchemaPublishMissingUrlError,
  UnexpectedError,
} from '../../helpers/errors';
import { gitInfo } from '../../helpers/git';
import { loadSchema, minifySchema, renderChanges, renderErrors } from '../../helpers/schema';
import * as TargetInput from '../../helpers/target-input';
import { invariant } from '../../helpers/validation';

const schemaPublishMutation = graphql(/* GraphQL */ `
  mutation schemaPublish($input: SchemaPublishInput!, $usesGitHubApp: Boolean!) {
    schemaPublish(input: $input) {
      __typename
      ... on SchemaPublishSuccess @skip(if: $usesGitHubApp) {
        initial
        valid
        successMessage: message
        linkToWebsite
        changes {
          nodes {
            message(withSafeBasedOnUsageNote: false)
            criticality
            isSafeBasedOnUsage
          }
          total
          ...RenderChanges_schemaChanges
        }
      }
      ... on SchemaPublishError @skip(if: $usesGitHubApp) {
        valid
        linkToWebsite
        changes {
          nodes {
            message(withSafeBasedOnUsageNote: false)
            criticality
            isSafeBasedOnUsage
          }
          total
          ...RenderChanges_schemaChanges
        }
        errors {
          nodes {
            message
          }
          total
        }
      }
      ... on SchemaPublishMissingServiceError @skip(if: $usesGitHubApp) {
        missingServiceError: message
      }
      ... on SchemaPublishMissingUrlError @skip(if: $usesGitHubApp) {
        missingUrlError: message
      }
      ... on GitHubSchemaPublishSuccess @include(if: $usesGitHubApp) {
        message
      }
      ... on GitHubSchemaPublishError @include(if: $usesGitHubApp) {
        message
      }
      ... on SchemaPublishRetry {
        reason
      }
    }
  }
`);

export default class SchemaPublish extends Command<typeof SchemaPublish> {
  static description = 'publishes schema';
  static flags = {
    service: Flags.string({
      description: 'service name (only for distributed schemas)',
    }),
    url: Flags.string({
      description: 'service url (only for distributed schemas)',
    }),
    metadata: Flags.string({
      description:
        'additional metadata to attach to the GraphQL schema. This can be a string with a valid JSON, or a path to a file containing a valid JSON',
    }),
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
    author: Flags.string({
      description: 'author of the change',
    }),
    commit: Flags.string({
      description: 'associated commit sha',
    }),
    github: Flags.boolean({
      description: 'Connect with GitHub Application',
      default: false,
    }),
    force: Flags.boolean({
      description: 'force publish even on breaking changes',
      deprecated: {
        message: '--force is enabled by default for newly created projects',
      },
    }),
    experimental_acceptBreakingChanges: Flags.boolean({
      description:
        '(experimental) accept breaking changes and mark schema as valid (only if composable)',
      deprecated: {
        message:
          '--experimental_acceptBreakingChanges is enabled by default for newly created projects',
      },
    }),
    require: Flags.string({
      description:
        'Loads specific require.extensions before running the codegen and reading the configuration',
      default: [],
      multiple: true,
    }),
    target: Flags.string({
      description:
        'The target to which to publish to (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
  };

  static args = {
    file: Args.string({
      name: 'file',
      required: true,
      description: 'Path to the schema file(s)',
      hidden: false,
    }),
  };

  resolveMetadata = (metadata: string | undefined): string | undefined => {
    if (!metadata) {
      return;
    }

    try {
      JSON.parse(metadata);
      // If we are able to parse it, it means it's a valid JSON, let's use it as-is

      return metadata;
    } catch (e) {
      // If we can't parse it, we can try to load it from FS
      return this.readJSON(metadata);
    }
  };

  async run() {
    try {
      const { flags, args } = await this.parse(SchemaPublish);

      await this.require(flags);

      let endpoint: string, accessToken: string;
      try {
        endpoint = this.ensure({
          key: 'registry.endpoint',
          args: flags,
          legacyFlagName: 'registry',
          defaultValue: graphqlEndpoint,
          env: 'HIVE_REGISTRY',
          description: SchemaPublish.flags['registry.endpoint'].description!,
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
          description: SchemaPublish.flags['registry.accessToken'].description!,
        });
      } catch (e) {
        throw new MissingRegistryTokenError();
      }
      const service = flags.service;
      const url = flags.url;
      const file = args.file;
      const force = flags.force;
      const experimental_acceptBreakingChanges = flags.experimental_acceptBreakingChanges;
      const metadata = this.resolveMetadata(flags.metadata);
      const usesGitHubApp = flags.github;

      let commit: string | undefined | null = this.maybe({
        key: 'commit',
        args: flags,
        env: 'HIVE_COMMIT',
      });
      let author: string | undefined | null = this.maybe({
        key: 'author',
        args: flags,
        env: 'HIVE_AUTHOR',
      });

      let gitHub: null | {
        repository: string;
        commit: string;
      } = null;

      if (!commit || !author) {
        const git = await gitInfo(() => {
          this.warn(`No git information found. Couldn't resolve author and commit.`);
        });

        if (!commit) {
          commit = git.commit;
        }

        if (!author) {
          author = git.author;
        }
      }

      if (!author) {
        throw new GithubAuthorRequiredError();
      }

      if (!commit) {
        throw new GithubCommitRequiredError();
      }

      if (usesGitHubApp) {
        // eslint-disable-next-line no-process-env
        const repository = process.env['GITHUB_REPOSITORY'] ?? null;
        if (!repository) {
          throw new MissingEnvironmentError([
            'GITHUB_REPOSITORY',
            'Github repository full name, e.g. graphql-hive/console',
          ]);
        }
        gitHub = {
          repository,
          commit,
        };
      }

      let target: GraphQLSchema.TargetReferenceInput | null = null;
      if (flags.target) {
        const result = TargetInput.parse(flags.target);
        if (result.type === 'error') {
          throw new InvalidTargetError();
        }
        target = result.data;
      }

      let sdl: string;
      try {
        const rawSdl = await loadSchema(file);
        invariant(typeof rawSdl === 'string' && rawSdl.length > 0, 'Schema seems empty');
        const transformedSDL = print(transformCommentsToDescriptions(rawSdl));
        sdl = minifySchema(transformedSDL);
      } catch (err) {
        if (err instanceof GraphQLError) {
          throw new InvalidSDLError(err);
        }
        throw err;
      }

      let result: DocumentType<typeof schemaPublishMutation> | null = null;

      do {
        result = await this.registryApi(endpoint, accessToken).request({
          operation: schemaPublishMutation,
          variables: {
            input: {
              service,
              url,
              author,
              commit,
              sdl,
              force,
              experimental_acceptBreakingChanges: experimental_acceptBreakingChanges === true,
              metadata,
              gitHub,
              supportsRetry: true,
              target,
            },
            usesGitHubApp: !!gitHub,
          },
          /** Gateway timeout is 60 seconds. */
          timeout: 55_000,
        });

        if (result.schemaPublish.__typename === 'SchemaPublishSuccess') {
          const changes = result.schemaPublish.changes;

          if (result.schemaPublish.initial) {
            this.logSuccess('Published initial schema.');
          } else if (result.schemaPublish.successMessage) {
            this.logSuccess(result.schemaPublish.successMessage);
          } else if (changes && changes.total === 0) {
            this.logSuccess('No changes. Skipping.');
          } else {
            if (changes) {
              this.log(renderChanges(changes));
            }
            this.logSuccess('Schema published');
          }

          if (result.schemaPublish.linkToWebsite) {
            this.logInfo(`Available at ${result.schemaPublish.linkToWebsite}`);
          }
        } else if (result.schemaPublish.__typename === 'SchemaPublishRetry') {
          this.log(result.schemaPublish.reason);
          this.log('Waiting for other schema publishes to complete...');
          result = null;
        } else if (result.schemaPublish.__typename === 'SchemaPublishMissingServiceError') {
          throw new SchemaPublishMissingServiceError(result.schemaPublish.missingServiceError);
        } else if (result.schemaPublish.__typename === 'SchemaPublishMissingUrlError') {
          throw new SchemaPublishMissingUrlError(result.schemaPublish.missingUrlError);
        } else if (result.schemaPublish.__typename === 'SchemaPublishError') {
          const changes = result.schemaPublish.changes;
          const errors = result.schemaPublish.errors;
          this.log(renderErrors(errors));

          if (changes && changes.total) {
            this.log('');
            this.log(renderChanges(changes));
          }
          this.log('');

          if (!force) {
            throw new SchemaPublishFailedError();
          } else {
            this.logSuccess('Schema published (forced)');
          }

          if (result.schemaPublish.linkToWebsite) {
            this.logInfo(`Available at ${result.schemaPublish.linkToWebsite}`);
          }
        } else if (result.schemaPublish.__typename === 'GitHubSchemaPublishSuccess') {
          this.logSuccess(result.schemaPublish.message);
        } else {
          throw new APIError(
            'message' in result.schemaPublish
              ? result.schemaPublish.message
              : `Received unhandled type "${(result.schemaPublish as any)?.__typename}" in response.`,
          );
        }
      } while (result === null);
    } catch (error) {
      if (error instanceof Errors.CLIError) {
        throw error;
      } else {
        this.logFailure('Failed to publish schema');
        throw new UnexpectedError(error instanceof Error ? error.message : JSON.stringify(error));
      }
    }
  }
}
