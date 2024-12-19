import { existsSync, readFileSync } from 'fs';
import { GraphQLError, print } from 'graphql';
import { transformCommentsToDescriptions } from '@graphql-tools/utils';
import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import { Fragments } from '../../fragments/__';
import { DocumentType, graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { casesExhausted } from '../../helpers/general';
import { gitInfo } from '../../helpers/git';
import { loadSchema, minifySchema } from '../../helpers/schema';
import { tb } from '../../helpers/typebox/__';
import { invariant } from '../../helpers/validation';
import { SchemaOutput } from '../../schema-output/__';

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
  static descriptionFragmentForAction = 'publish schema';
  static parameters = {
    positional: tb.Tuple([tb.String()]),
    named: tb.Object({
      json: tb.Optional(tb.Boolean()),
      service: tb.Optional(tb.String()),
      url: tb.Optional(tb.String()),
      metadata: tb.Optional(tb.String()),
      'registry.endpoint': tb.Optional(tb.String()),
      'registry.accessToken': tb.Optional(tb.String()),
      author: tb.Optional(tb.String()),
      commit: tb.Optional(tb.String()),
      github: tb.Optional(tb.Boolean()),
      force: tb.Optional(tb.Boolean()),
      experimental_acceptBreakingChanges: tb.Optional(tb.Boolean()),
      require: tb.Optional(tb.Array(tb.String())),
    }),
  };
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
  static output = SchemaOutput.output(
    SchemaOutput.success({
      __typename: tb.Literal('SchemaPublishSuccess'),
      changes: tb.Array(SchemaOutput.SchemaChange),
      url: tb.Nullable(tb.String({ format: 'uri' })),
    }),
    SchemaOutput.success({
      __typename: tb.Literal('SchemaPublishError'),
      changes: tb.Array(SchemaOutput.SchemaChange),
      errors: tb.Array(SchemaOutput.SchemaError),
      url: tb.Nullable(tb.String({ format: 'uri' })),
    }),
    SchemaOutput.success({
      __typename: tb.Literal('GitHubSchemaPublishSuccess'),
      message: tb.String(),
    }),
    SchemaOutput.failure({
      __typename: tb.Literal('GitHubSchemaPublishError'),
      message: tb.String(),
    }),
  );

  resolveMetadata(metadata: string | undefined): string | undefined {
    if (!metadata) {
      return;
    }

    try {
      JSON.parse(metadata);
      // If we are able to parse it, it means it's a valid JSON, let's use it as-is

      return metadata;
    } catch (e) {
      // If we can't parse it, we can try to load it from FS
      const exists = existsSync(metadata);

      if (!exists) {
        throw new Error(
          `Failed to load metadata from "${metadata}": Please specify a path to an existing file, or a string with valid JSON.`,
        );
      }

      try {
        const fileContent = readFileSync(metadata, 'utf-8');
        JSON.parse(fileContent);

        return fileContent;
      } catch (e) {
        throw new Error(
          `Failed to load metadata from file "${metadata}": Please make sure the file is readable and contains a valid JSON`,
        );
      }
    }
  }

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
    });
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
        const location = err.locations?.[0];
        const locationString = location
          ? ` at line ${location.line}, column ${location.column}`
          : '';
        throw new Error(`The SDL is not valid${locationString}:\n ${err.message}`);
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
              force,
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
      if (result.initial) {
        this.logSuccess('Published initial schema.');
      } else if (result.successMessage) {
        this.logSuccess(result.successMessage);
      } else if (result.changes && result.changes.total === 0) {
        this.logSuccess('No changes. Skipping.');
      } else {
        if (result.changes) {
          Fragments.SchemaChangeConnection.log.call(this, result.changes);
        }
        this.logSuccess('Schema published');
      }

      if (result.linkToWebsite) {
        this.logInfo(`Available at ${result.linkToWebsite}`);
      }

      return this.success({
        __typename: 'SchemaPublishSuccess',
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
      Fragments.SchemaErrorConnection.log.call(this, result.errors);

      if (result.changes?.total) {
        this.log('');
        Fragments.SchemaChangeConnection.log.call(this, result.changes);
      }
      this.log('');

      if (!force) {
        this.logFailure('Failed to publish schema');
        this.exit(1);
      } else {
        this.logSuccess('Schema published (forced)');
      }

      if (result.linkToWebsite) {
        this.logInfo(`Available at ${result.linkToWebsite}`);
      }

      return this.success({
        __typename: 'SchemaPublishError',
        changes: Fragments.SchemaChangeConnection.toSchemaOutput(result.changes),
        errors: Fragments.SchemaErrorConnection.toSchemaOutput(result.errors),
        url: result.linkToWebsite ?? null,
      });
    }

    if (result.__typename === 'GitHubSchemaPublishSuccess') {
      this.logSuccess(result.message);
      return this.success({
        __typename: 'GitHubSchemaPublishSuccess',
        message: result.message,
      });
    }

    if (result.__typename === 'GitHubSchemaPublishError') {
      // todo: Why property check? Types suggest it is always there.
      const message = 'message' in result ? result.message : 'Unknown error';
      this.error(message);
      return this.failure({
        __typename: 'GitHubSchemaPublishError',
        message,
      });
    }

    throw casesExhausted(result);
  }
}
