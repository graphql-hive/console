import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import { Fragments } from '../../fragments/__';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { ACCESS_TOKEN_MISSING } from '../../helpers/errors';
import { casesExhausted } from '../../helpers/general';
import { gitInfo } from '../../helpers/git';
import { loadSchema, minifySchema } from '../../helpers/schema';
import { T } from '../../helpers/typebox/__';
import { Output } from '../../output/__';

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
  };
  static args = {
    file: Args.string({
      name: 'file',
      required: true,
      description: 'Path to the schema file(s)',
      hidden: false,
    }),
  };
  static output = [
    Output.success('SuccessSchemaCheck', {
      data: {
        diffType: T.Enum({
          initial: 'initial',
          change: 'change',
          unknown: 'unknown', // todo: improve this, need better understanding of the api
        }),
        changes: T.Array(Output.SchemaChange),
        warnings: T.Array(Output.SchemaWarning),
        url: T.Nullable(T.String({ format: 'uri' })),
      },
      text(_, data, t) {
        if (data.diffType === 'initial') {
          t.success('Schema registry is empty, nothing to compare your schema with.');
        } else if (data.diffType === 'change' && data.changes.length === 0) {
          t.line('No changes');
        } else {
          t.line(Output.schemaChangesText(data.changes));
          t.line();
          t.line();
        }
        if (data.warnings.length) {
          t.line(Output.schemaWarningsText(data.warnings));
          t.line();
        }
        if (data.url) {
          t.line(`View full report:`);
          t.line(data.url);
        }
      },
    }),
    Output.success('SuccessSchemaCheckGitHub', {
      data: {
        message: T.String(),
      },
      text(_, data, t) {
        t.success(data.message);
      },
    }),
    Output.success('FailureSchemaCheck', {
      data: {
        changes: Output.SchemaChanges,
        warnings: Output.SchemaWarnings,
        errors: Output.SchemaErrors,
        url: T.Nullable(T.String({ format: 'uri' })),
      },
      text({ flags }, data, t) {
        t.line(Output.schemaErrorsText(data.errors));
        t.line();
        if (data.warnings.length) {
          t.line(Output.schemaWarningsText(data.warnings));
          t.line();
          t.line();
        }
        if (data.changes.length) {
          t.line(Output.schemaChangesText(data.changes));
          t.line();
        }
        if (data.url) {
          t.line(`View full report:`);
          t.line(data.url);
          t.line();
        }
        if (flags.forceSafe) {
          t.success('Breaking changes were expected (forced)');
        }
      },
    }),

    Output.failure('FailureSchemaCheckGitHub', {
      data: {
        message: T.String(),
      },
      text(_, data, t) {
        t.failure(data.message);
      },
    }),
  ];

  async runResult() {
    const { flags, args } = await this.parse(SchemaCheck);

    await this.require(flags);

    const service = flags.service;
    const forceSafe = flags.forceSafe;
    const usesGitHubApp = flags.github === true;
    const endpoint = this.ensure({
      key: 'registry.endpoint',
      args: flags,
      legacyFlagName: 'registry',
      defaultValue: graphqlEndpoint,
      env: 'HIVE_REGISTRY',
    });
    const file = args.file;
    const accessToken = this.ensure({
      key: 'registry.accessToken',
      args: flags,
      legacyFlagName: 'token',
      env: 'HIVE_TOKEN',
      message: ACCESS_TOKEN_MISSING,
    });
    const sdl = await loadSchema(file);
    const git = await gitInfo(() => {
      // noop
    });

    const commit = flags.commit || git?.commit;
    const author = flags.author || git?.author;

    if (typeof sdl !== 'string' || sdl.length === 0) {
      throw new Errors.CLIError('Schema seems empty');
    }

    let github: null | {
      commit: string;
      repository: string | null;
      pullRequestNumber: string | null;
    } = null;

    if (usesGitHubApp) {
      if (!commit) {
        throw new Errors.CLIError(`Couldn't resolve commit sha required for GitHub Application`);
      }
      if (!git.repository) {
        throw new Errors.CLIError(
          `Couldn't resolve git repository required for GitHub Application`,
        );
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

    const result = await this.registryApi(endpoint, accessToken)
      .request({
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
          },
          usesGitHubApp,
        },
      })
      .then(_ => _.schemaCheck);

    if (result.__typename === 'SchemaCheckSuccess') {
      return this.success({
        type: 'SuccessSchemaCheck',
        diffType: result.initial ? 'initial' : result.changes ? 'change' : 'unknown',
        warnings: Fragments.SchemaWarningConnection.toSchemaOutput(result.warnings),
        changes: Fragments.SchemaChangeConnection.toSchemaOutput(result.changes),
        url: result.schemaCheck?.webUrl ?? null,
      });
    }

    if (result.__typename === 'SchemaCheckError') {
      if (!forceSafe) {
        process.exitCode = 1;
      }
      return this.success({
        type: 'FailureSchemaCheck',
        errors: Fragments.SchemaErrorConnection.toSchemaOutput(result.errors),
        warnings: Fragments.SchemaWarningConnection.toSchemaOutput(result.warnings),
        changes: Fragments.SchemaChangeConnection.toSchemaOutput(result.changes),
        url: result.schemaCheck?.webUrl ?? null,
      });
    }

    if (result.__typename === 'GitHubSchemaCheckSuccess') {
      return this.success({
        type: 'SuccessSchemaCheckGitHub',
        message: result.message,
      });
    }

    if (result.__typename === 'GitHubSchemaCheckError') {
      return this.failure({
        type: 'FailureSchemaCheckGitHub',
        message: result.message,
      });
    }

    throw casesExhausted(result);
  }
}
