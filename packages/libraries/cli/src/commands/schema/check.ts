import fs from 'node:fs';
import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import * as GraphQLSchema from '../../gql/graphql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  APIError,
  GithubCommitRequiredError,
  GithubRepositoryRequiredError,
  InvalidTargetError,
  MissingEndpointError,
  MissingRegistryTokenError,
  SchemaFileEmptyError,
  SchemaFileNotFoundError,
  UnexpectedError,
} from '../../helpers/errors';
import { gitInfo } from '../../helpers/git';
import {
  loadSchema,
  minifySchema,
  renderChanges,
  renderErrors,
  renderWarnings,
} from '../../helpers/schema';
import * as TargetSlug from '../../helpers/target-slug';

const schemaCheckMutation = graphql(/* GraphQL */ `
  mutation schemaCheck($input: SchemaCheckInput!, $usesGitHubApp: Boolean!) {
    schemaCheck(input: $input) {
      __typename
      ... on SchemaCheckSuccess @skip(if: $usesGitHubApp) {
        valid
        initial
        warnings {
          nodes {
            message
            source
            line
            column
          }
          total
        }
        changes {
          nodes {
            message(withSafeBasedOnUsageNote: false)
            criticality
            isSafeBasedOnUsage
            approval {
              approvedBy {
                id
                displayName
              }
            }
          }
          total
          ...RenderChanges_schemaChanges
        }
        schemaCheck {
          webUrl
        }
      }
      ... on SchemaCheckError @skip(if: $usesGitHubApp) {
        valid
        changes {
          nodes {
            message(withSafeBasedOnUsageNote: false)
            criticality
            isSafeBasedOnUsage
          }
          total
          ...RenderChanges_schemaChanges
        }
        warnings {
          nodes {
            message
            source
            line
            column
          }
          total
        }
        errors {
          nodes {
            message
          }
          total
        }
        schemaCheck {
          webUrl
        }
      }
      ... on GitHubSchemaCheckSuccess @include(if: $usesGitHubApp) {
        message
      }
      ... on GitHubSchemaCheckError @include(if: $usesGitHubApp) {
        message
      }
    }
  }
`);

export default class SchemaCheck extends Command<typeof SchemaCheck> {
  static description = 'checks schema';
  static flags = {
    service: Flags.string({
      description: 'service name (only for distributed schemas)',
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
    experimentalJsonFile: Flags.string({
      name: 'experimental-json-file',
      description:
        "File path to output a JSON file containing the command's result. Useful for e.g. CI scripting with `jq`.",
    }),
    forceSafe: Flags.boolean({
      description: 'mark the check as safe, breaking changes are expected',
    }),
    github: Flags.boolean({
      description: 'Connect with GitHub Application',
      default: false,
    }),
    require: Flags.string({
      description:
        'Loads specific require.extensions before running the codegen and reading the configuration',
      default: [],
      multiple: true,
    }),
    author: Flags.string({
      description: 'Author of the change',
    }),
    commit: Flags.string({
      description: 'Associated commit sha',
    }),
    contextId: Flags.string({
      description: 'Context ID for grouping the schema check.',
    }),
    target: Flags.string({
      description: 'The target to which to publish to.',
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

  async run() {
    try {
      const { flags, args } = await this.parse(SchemaCheck);

      await this.require(flags);

      let target: GraphQLSchema.TargetSelectorInput | null = null;
      if (flags.target) {
        const result = TargetSlug.parse(flags.target);
        if (result.type === 'error') {
          throw new InvalidTargetError();
        }
        target = result.data;
      }

      const service = flags.service;
      const forceSafe = flags.forceSafe;
      const usesGitHubApp = flags.github === true;
      let endpoint: string, accessToken: string;
      try {
        endpoint = this.ensure({
          key: 'registry.endpoint',
          args: flags,
          legacyFlagName: 'registry',
          defaultValue: graphqlEndpoint,
          env: 'HIVE_REGISTRY',
          description: SchemaCheck.flags['registry.endpoint'].description!,
        });
      } catch (e) {
        throw new MissingEndpointError();
      }
      const file = args.file;
      try {
        accessToken = this.ensure({
          key: 'registry.accessToken',
          args: flags,
          legacyFlagName: 'token',
          env: 'HIVE_TOKEN',
          description: SchemaCheck.flags['registry.accessToken'].description!,
        });
      } catch (e) {
        throw new MissingRegistryTokenError();
      }

      const sdl = await loadSchema(file).catch(e => {
        throw new SchemaFileNotFoundError(file, e);
      });
      const git = await gitInfo(() => {
        // noop
      });

      const commit = flags.commit || git?.commit;
      const author = flags.author || git?.author;

      if (typeof sdl !== 'string' || sdl.length === 0) {
        throw new SchemaFileEmptyError(file);
      }

      let github: null | {
        commit: string;
        repository: string | null;
        pullRequestNumber: string | null;
      } = null;

      if (usesGitHubApp) {
        if (!commit) {
          throw new GithubCommitRequiredError();
        }
        if (!git.repository) {
          throw new GithubRepositoryRequiredError();
        }
        if (!git.pullRequestNumber) {
          this.warn(
            "Could not resolve pull request number. Are you running this command on a 'pull_request' event?\n" +
              'See https://the-guild.dev/graphql/hive/docs/other-integrations/ci-cd#github-workflow-for-ci',
          );
        }

        github = {
          commit: commit,
          repository: git.repository,
          pullRequestNumber: git.pullRequestNumber,
        };
      }

      const result = await this.registryApi(endpoint, accessToken).request({
        operation: schemaCheckMutation,
        variables: {
          input: {
            service,
            sdl: minifySchema(sdl),
            github,
            meta:
              !!commit && !!author
                ? {
                    commit,
                    author,
                  }
                : null,
            contextId: flags.contextId ?? undefined,
            target,
          },
          usesGitHubApp,
        },
      });

      if (flags.experimentalJsonFile) {
        fs.writeFileSync(flags.experimentalJsonFile, JSON.stringify(result, null, 2));
      }

      if (result.schemaCheck.__typename === 'SchemaCheckSuccess') {
        const changes = result.schemaCheck.changes;
        if (result.schemaCheck.initial) {
          this.logSuccess('Schema registry is empty, nothing to compare your schema with.');
        } else if (!changes?.total) {
          this.logSuccess('No changes');
        } else {
          this.log(renderChanges(changes));
        }

        const warnings = result.schemaCheck.warnings;
        if (warnings?.total) {
          this.log(renderWarnings(warnings));
        }

        if (result.schemaCheck.schemaCheck?.webUrl) {
          this.log(`View full report:\n${result.schemaCheck.schemaCheck.webUrl}`);
        }
      } else if (result.schemaCheck.__typename === 'SchemaCheckError') {
        const changes = result.schemaCheck.changes;
        const errors = result.schemaCheck.errors;
        const warnings = result.schemaCheck.warnings;
        this.log(renderErrors(errors));

        if (warnings?.total) {
          this.log(renderWarnings(warnings));
        }

        if (changes && changes.total) {
          this.log(renderChanges(changes));
        }

        if (result.schemaCheck.schemaCheck?.webUrl) {
          this.log(`View full report:\n${result.schemaCheck.schemaCheck.webUrl}`);
        }

        this.log('');

        if (forceSafe) {
          this.logSuccess('Breaking changes were expected (forced)');
        } else {
          this.exit(1);
        }
      } else if (result.schemaCheck.__typename === 'GitHubSchemaCheckSuccess') {
        this.logSuccess(result.schemaCheck.message);
      } else {
        throw new APIError(result.schemaCheck.message);
      }
    } catch (error) {
      if (error instanceof Errors.CLIError) {
        throw error;
      } else {
        this.logFailure('Failed to check schema');
        throw new UnexpectedError(error);
      }
    }
  }
}
