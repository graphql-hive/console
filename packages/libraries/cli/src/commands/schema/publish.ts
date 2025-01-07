import { existsSync, readFileSync } from 'fs';
import { GraphQLError, print } from 'graphql';
import { transformCommentsToDescriptions } from '@graphql-tools/utils';
import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import { Fragments } from '../../fragments/__';
import { DocumentType, graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { orEnvar } from '../../helpers/env';
import { ACCESS_TOKEN_MISSING } from '../../helpers/errors';
import { casesExhausted } from '../../helpers/general';
import { gitInfo } from '../../helpers/git';
import { InferInput } from '../../helpers/oclif';
import { loadSchema, minifySchema } from '../../helpers/schema';
import { T } from '../../helpers/typebox/__';
import { invariant } from '../../helpers/validation';
import { Output } from '../../output/__';

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
    Output.success('SuccessSchemaPublish', {
      data: {
        diffType: T.Enum({
          initial: 'initial',
          change: 'change',
          unknown: 'unknown', // todo: improve this, need better understanding of the api
        }),
        message: T.Nullable(T.String()),
        changes: T.Array(Output.SchemaChange),
        url: T.Nullable(T.String({ format: 'uri' })),
      },
      text(_, data, t) {
        if (data.diffType === 'initial') {
          t.success('Published initial schema.');
        } else if (data.message) {
          t.success(data.message);
        } else if (data.diffType === 'change' && data.changes.length === 0) {
          t.success('No changes. Skipping.');
        } else {
          if (data.changes.length) {
            t.line(Output.schemaChangesText(data.changes));
            t.line();
          }
          t.success('Schema published');
        }
        if (data.url) {
          t.info(`Available at ${data.url}`);
        }
      },
    }),
    Output.success('FailureSchemaPublish', {
      data: {
        changes: Output.SchemaChanges,
        errors: Output.SchemaErrors,
        url: T.Nullable(T.String({ format: 'uri' })),
      },
      text({ flags }: InferInput<typeof SchemaPublish>, data, t) {
        t.line(Output.schemaErrorsText(data.errors));
        t.line();
        if (data.changes.length) {
          t.line(Output.schemaChangesText(data.changes));
          t.line();
        }
        if (!flags.force) {
          t.failure('Failed to publish schema');
        } else {
          t.success('Schema published (forced)');
        }
        if (data.url) {
          t.info(`Available at ${data.url}`);
        }
      },
    }),
    Output.success('SuccessSchemaPublishGitHub', {
      data: {
        message: T.String(),
      },
      text(_, data, t) {
        t.success(data.message);
      },
    }),
    Output.failure('FailureSchemaPublishGitHub', {
      data: {
        message: T.String(),
      },
      text(_, data, t) {
        t.failure(data.message);
      },
    }),
    Output.failure('FailureResolveMetadata', {
      data: {
        reason: T.Union([
          T.Object({
            type: T.Literal('notFound'),
            path: T.String(),
          }),
          T.Object({
            type: T.Literal('readFail'),
            path: T.String(),
            message: T.String(),
          }),
          T.Object({
            type: T.Literal('invalidJson'),
            path: T.String(),
            value: T.String(),
            message: T.String(),
          }),
        ]),
      },
      text(_, data, t) {
        switch (data.reason.type) {
          case 'notFound':
            t.failure(
              `Failed to load metadata from "${data.reason.path}": Please specify a path to an existing file, or a string with valid JSON.`,
            );
            break;
          case 'readFail':
            t.failure(`Failed to load metadata from "${data.reason.path}": ${data.reason.message}`);
            break;
          case 'invalidJson':
            t.failure(
              `Failed to load metadata from "${data.reason.path}": Please make sure the file is readable and contains a valid JSON`,
            );
            break;
          default:
            casesExhausted(data.reason);
        }
      },
    }),
    Output.failure('FailureSchemaPublishInvalidGraphQLSchema', {
      data: {
        message: T.String(),
        locations: T.Array(
          T.Object({
            line: T.Readonly(T.Number()),
            column: T.Readonly(T.Number()),
          }),
        ),
      },
      text(_, data, t) {
        const location =
          data.locations.length > 0
            ? ` at line ${data.locations[0].line}, column ${data.locations[0].column}`
            : '';
        t.failure(`The SDL is not valid${location}:`);
        t.line(data.message);
      },
    }),
  ];

  async runResult() {
    const { flags, args } = await this.parse(SchemaPublish);

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
      message: ACCESS_TOKEN_MISSING,
    });
    const service = flags.service;
    const url = flags.url;
    const file = args.file;
    const experimental_acceptBreakingChanges = flags.experimental_acceptBreakingChanges;
    const usesGitHubApp = flags.github;
    const metadata = this.resolveMetadata(flags.metadata);
    if (typeof metadata === 'object') {
      return metadata;
    }

    let commit = orEnvar(flags.commit, 'HIVE_COMMIT');
    let author = orEnvar(flags.author, 'HIVE_AUTHOR');

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
      throw new Errors.CLIError(`Missing "author"`);
    }

    if (!commit) {
      throw new Errors.CLIError(`Missing "commit"`);
    }

    if (usesGitHubApp) {
      // eslint-disable-next-line no-process-env
      const repository = process.env['GITHUB_REPOSITORY'] ?? null;
      if (!repository) {
        throw new Errors.CLIError(`Missing "GITHUB_REPOSITORY" environment variable.`);
      }
      gitHub = {
        repository,
        commit,
      };
    }

    let sdl: string;
    try {
      const rawSdl = await loadSchema(file);
      invariant(typeof rawSdl === 'string' && rawSdl.length > 0, 'Schema seems empty');
      const transformedSDL = print(transformCommentsToDescriptions(rawSdl));
      sdl = minifySchema(transformedSDL);
    } catch (err) {
      if (err instanceof GraphQLError) {
        const locations = err.locations?.map(location => ({ ...location })) ?? [];
        return this.failure({
          type: 'FailureSchemaPublishInvalidGraphQLSchema',
          message: err.message,
          locations,
        });
      }
      throw err;
    }

    let result: DocumentType<typeof schemaPublishMutation>['schemaPublish'] | null = null;

    do {
      const loopResult = await this.registryApi(endpoint, accessToken)
        .request({
          operation: schemaPublishMutation,
          variables: {
            input: {
              service,
              url,
              author,
              commit,
              sdl,
              force: flags.force,
              experimental_acceptBreakingChanges: experimental_acceptBreakingChanges === true,
              metadata,
              gitHub,
              supportsRetry: true,
            },
            usesGitHubApp: !!gitHub,
          },
          /** Gateway timeout is 60 seconds. */
          timeout: 55_000,
        })
        .then(data => data.schemaPublish);

      if (loopResult) {
        if (loopResult.__typename === 'SchemaPublishRetry') {
          this.log(loopResult.reason);
          this.log('Waiting for other schema publishes to complete...');
          result = null;
          continue;
        }

        result = loopResult;
      }
    } while (result === null);

    if (result.__typename === 'SchemaPublishSuccess') {
      // todo can this data type be split into different cases?
      return this.success({
        type: 'SuccessSchemaPublish',
        // In API it seems that these two cases represent different things:
        // 1. result.changes = undefined
        // 2. result.changes = []
        // TODO understand this better and improve the name of "unknown" here.
        diffType: result.initial ? 'initial' : result.changes ? 'change' : 'unknown',
        message: result.successMessage || null,
        changes: Fragments.SchemaChangeConnection.toSchemaOutput(result.changes),
        url: result.linkToWebsite ?? null,
      });
    }

    if (result.__typename === 'SchemaPublishMissingServiceError') {
      this.logFailure(`${result.missingServiceError} Please use the '--service <name>' parameter.`);
      this.exit(1);
    }

    if (result.__typename === 'SchemaPublishMissingUrlError') {
      this.logFailure(`${result.missingUrlError} Please use the '--url <url>' parameter.`);
      this.exit(1);
    }

    if (result.__typename === 'SchemaPublishError') {
      return this.successEnvelope({
        exitCode: flags.force ? 0 : 1,
        data: {
          type: 'FailureSchemaPublish',
          changes: Fragments.SchemaChangeConnection.toSchemaOutput(result.changes),
          errors: Fragments.SchemaErrorConnection.toSchemaOutput(result.errors),
          url: result.linkToWebsite ?? null,
        },
      });
    }

    if (result.__typename === 'GitHubSchemaPublishSuccess') {
      return this.success({
        type: 'SuccessSchemaPublishGitHub',
        message: result.message,
      });
    }

    if (result.__typename === 'GitHubSchemaPublishError') {
      return this.failure({
        type: 'FailureSchemaPublishGitHub',
        // todo: Why property check? Types suggest it is always there.
        message: 'message' in result ? result.message : 'Unknown error',
      });
    }

    throw casesExhausted(result);
  }

  resolveMetadata(metadata: string | undefined) {
    if (!metadata) {
      return;
    }

    try {
      JSON.parse(metadata);
      // If we are able to parse it, it means it's a valid JSON, let's use it as-is
      return metadata;
    } catch (e) {
      // If we can't parse it, we can try to load it from FS
      // todo helper function for json file read
      const exists = existsSync(metadata);
      if (!exists) {
        return this.failure({
          type: 'FailureResolveMetadata',
          reason: {
            type: 'notFound',
            path: metadata,
          },
        });
      }

      let fileContent: string;
      try {
        fileContent = readFileSync(metadata, 'utf-8');
      } catch (_) {
        const error = _ as Error;
        return this.failure({
          type: 'FailureResolveMetadata',
          reason: {
            type: 'readFail',
            path: metadata,
            message: error.message,
          },
        });
      }

      try {
        JSON.parse(fileContent);
      } catch (_) {
        const error = _ as Error;
        return this.failure({
          type: 'FailureResolveMetadata',
          reason: {
            type: 'invalidJson',
            path: metadata,
            value: fileContent,
            message: error.message,
          },
        });
      }

      return fileContent;
    }
  }
}
