import fs from 'node:fs';
import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import { DocumentType, graphql } from '../../gql';
import * as GraphQLSchema from '../../gql/graphql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  APIError,
  CommitRequiredError,
  ForceSafeRequiresTargetSlugError,
  GithubRepositoryRequiredError,
  InvalidTargetError,
  MissingEndpointError,
  MissingRegistryTokenError,
  SchemaCheckApprovalFailedError,
  SchemaCheckFailedError,
  SchemaFileNotFoundError,
  UnexpectedError,
} from '../../helpers/errors';
import { gitInfo } from '../../helpers/git';
import {
  loadSchemaFromGitHistory,
  parseBaselineGitFileReference,
} from '../../helpers/git-schema-loader';
import {
  loadSchema,
  loadSchemaSdl,
  minifySchema,
  renderChanges,
  renderErrors,
  renderWarnings,
} from '../../helpers/schema';
import * as TargetInput from '../../helpers/target-input';

const approveFailedSchemaCheckMutation = graphql(/* GraphQL */ `
  mutation approveFailedSchemaCheck($input: ApproveFailedSchemaCheckInput!) {
    approveFailedSchemaCheck(input: $input) {
      ok {
        schemaCheck {
          id
        }
      }
      error {
        message
      }
    }
  }
`);

const schemaCheckMutation = graphql(/* GraphQL */ `
  mutation CLI_SchemaCheckMutation($input: SchemaCheckInput!) {
    schemaCheck(input: $input) {
      __typename
      ... on SchemaCheckSuccess {
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
          edges {
            __typename
          }
          ...RenderChanges_schemaChanges
        }
        schemaCheck {
          id
          webUrl
        }
      }
      ... on SchemaCheckError {
        valid
        changes {
          edges {
            __typename
          }
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
          ...RenderErrors_SchemaErrorConnectionFragment
        }
        schemaCheck {
          id
          webUrl
        }
      }
      ... on GitHubSchemaCheckSuccess {
        message
      }
      ... on GitHubSchemaCheckError {
        message
      }
    }
  }
`);

/** Only used with `--github`, so that servers without these fields keep working for other checks. */
const schemaCheckGitHubMutation = graphql(/* GraphQL */ `
  mutation CLI_SchemaCheckGitHubMutation($input: SchemaCheckInput!) {
    schemaCheck(input: $input) {
      __typename
      ... on SchemaCheckSuccess {
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
          edges {
            __typename
          }
          ...RenderChanges_schemaChanges
        }
        schemaCheck {
          id
          webUrl
        }
      }
      ... on SchemaCheckError {
        valid
        changes {
          edges {
            __typename
          }
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
          ...RenderErrors_SchemaErrorConnectionFragment
        }
        schemaCheck {
          id
          webUrl
        }
      }
      ... on GitHubSchemaCheckSuccess {
        message
        valid
        schemaCheck {
          id
          webUrl
        }
      }
      ... on GitHubSchemaCheckError {
        message
      }
    }
  }
`);

/** GitHub results are only returned for requests that use `schemaCheckGitHubMutation`. */
type GitHubSchemaCheckSuccessResult = Extract<
  DocumentType<typeof schemaCheckGitHubMutation>['schemaCheck'],
  { __typename: 'GitHubSchemaCheckSuccess' }
>;

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
    baseline: Flags.string({
      description:
        'File containing the schema before the current change.\n' +
        'Baseline schema to compare against. Accepts a local file path or a file at a' +
        'Git revision using `<revision>:<path>`.',
    }),
    contextId: Flags.string({
      description: 'Context ID for grouping the schema check.',
    }),
    target: Flags.string({
      description:
        'The target against which to check the schema (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
    url: Flags.string({
      description:
        'If checking a service, then you can optionally provide the service URL to see the difference in the supergraph during the check.',
    }),
    schemaProposalId: Flags.string({
      description: 'Attach the schema check to a schema proposal.',
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

      let target: GraphQLSchema.TargetReferenceInput | null = null;
      if (flags.target) {
        const result = TargetInput.parse(flags.target);
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
        this.logDebug(e);
        throw new MissingEndpointError();
      }
      const schemaPointer = args.file;
      try {
        accessToken = this.ensure({
          key: 'registry.accessToken',
          args: flags,
          legacyFlagName: 'token',
          env: 'HIVE_TOKEN',
          description: SchemaCheck.flags['registry.accessToken'].description!,
        });
      } catch (e) {
        this.logDebug(e);
        throw new MissingRegistryTokenError();
      }

      const git = await gitInfo(() => {
        // noop
      });

      const commit = flags.commit || git?.commit;

      let github: null | GraphQLSchema.GitHubSchemaCheckInput = null;

      if (usesGitHubApp) {
        if (!commit) {
          throw new CommitRequiredError();
        }
        if (!git.repository) {
          throw new GithubRepositoryRequiredError();
        }
        if (!git.pullRequestNumber) {
          this.warn(
            "Could not resolve pull request number. Are you running this command on a 'pull_request' or 'merge_group' event?\n" +
              'See https://the-guild.dev/graphql/hive/docs/other-integrations/ci-cd#github-workflow-for-ci',
          );
        }

        github = {
          commit: commit,
          repository: git.repository,
          pullRequestNumber: git.pullRequestNumber,
        };
      }

      let minifiedBaselineSdl: string | null = null;
      let baselineSchemaHash: string | null = null;

      if (flags.baseline) {
        const baselinePointer = flags.baseline;
        const gitResult = parseBaselineGitFileReference(baselinePointer);
        const result =
          gitResult.status === 'error'
            ? await loadSchema('first-federation-then-graphql-introspection', baselinePointer, {
                logger: this.logger,
              })
                .catch(() => {
                  throw new SchemaFileNotFoundError(
                    baselinePointer,
                    'Failed to retrieve the baseline schema from ' + baselinePointer,
                  );
                })
                .then(sdl => ({
                  status: 'ok' as const,
                  sdl,
                }))
            : loadSchemaFromGitHistory(gitResult.filePath, gitResult.commit);

        if (result.status === 'error') {
          switch (result.error.type) {
            case 'git':
              throw new SchemaFileNotFoundError(
                result.error.path,
                'Failed to retrieve the baseline schema from the git history.\n' +
                  result.error.message,
              );
            case 'path':
              throw new SchemaFileNotFoundError(
                schemaPointer,
                `When using the '--baseline' flag, the file path must point to a single file containing the schema SDL.`,
              );
          }
        }

        minifiedBaselineSdl = minifySchema(result.sdl);
        baselineSchemaHash = gitResult.commit ?? git.baselineCommit;
      }

      const rawSdl = await loadSchemaSdl(schemaPointer, { logger: this.logger });

      const author = flags.author || git?.author;

      const sdl = minifySchema(rawSdl);

      const input: GraphQLSchema.SchemaCheckInput = {
        service,
        sdl,
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
        url: flags.url,
        schemaProposalId: flags.schemaProposalId,
        baseline: minifiedBaselineSdl
          ? {
              sdl: minifiedBaselineSdl,
              hash: baselineSchemaHash,
            }
          : null,
      };

      const api = this.registryApi(endpoint, accessToken);
      /** Gateway timeout is 60 seconds. */
      const timeout = 55_000;
      const result = usesGitHubApp
        ? await api.request({
            operation: schemaCheckGitHubMutation,
            variables: { input },
            timeout,
          })
        : await api.request({
            operation: schemaCheckMutation,
            variables: { input },
            timeout,
          });

      const handleFailedCheck = async (schemaCheckId: string | null | undefined) => {
        if (!forceSafe) {
          throw new SchemaCheckFailedError();
        }

        if (!target?.bySelector) {
          throw new ForceSafeRequiresTargetSlugError();
        }

        if (!schemaCheckId) {
          throw new SchemaCheckApprovalFailedError(
            'The registry did not store this schema check, so it cannot be approved.',
          );
        }

        const approvalResult = await api.request({
          operation: approveFailedSchemaCheckMutation,
          variables: {
            input: {
              organizationSlug: target.bySelector.organizationSlug,
              projectSlug: target.bySelector.projectSlug,
              targetSlug: target.bySelector.targetSlug,
              schemaCheckId,
              comment: 'Check force approved automatically via CLI --forceSafe flag',
              author: author ?? '',
            },
          },
        });

        if (approvalResult.approveFailedSchemaCheck.error) {
          throw new SchemaCheckApprovalFailedError(
            approvalResult.approveFailedSchemaCheck.error.message,
          );
        }

        this.logSuccess('Breaking changes were expected (forced)');
      };

      if (flags.experimentalJsonFile) {
        fs.writeFileSync(flags.experimentalJsonFile, JSON.stringify(result, null, 2));
      }

      const payload = result.schemaCheck;

      if (payload.__typename === 'SchemaCheckSuccess') {
        const changes = payload.changes;
        if (payload.initial) {
          this.logSuccess('Schema registry is empty, nothing to compare your schema with.');
        } else if (!changes?.edges.length) {
          this.logSuccess('No changes');
        } else {
          this.log(renderChanges(changes));
        }

        const warnings = payload.warnings;
        if (warnings?.total) {
          this.log(renderWarnings(warnings));
        }

        if (payload.schemaCheck?.webUrl) {
          this.log(`View full report:\n${payload.schemaCheck.webUrl}`);
        }
      } else if (payload.__typename === 'SchemaCheckError') {
        const changes = payload.changes;
        const errors = payload.errors;
        const warnings = payload.warnings;
        this.log(renderErrors(errors));

        if (warnings?.total) {
          this.log(renderWarnings(warnings));
        }

        if (changes?.edges.length) {
          this.log(renderChanges(changes));
        }

        if (payload.schemaCheck?.webUrl) {
          this.log(`View full report:\n${payload.schemaCheck.webUrl}`);
        }

        this.log('');

        await handleFailedCheck(payload.schemaCheck?.id);
      } else if (payload.__typename === 'GitHubSchemaCheckSuccess') {
        const gitHubResult = payload as GitHubSchemaCheckSuccessResult;

        if (gitHubResult.valid) {
          this.logSuccess(gitHubResult.message);
        }

        if (gitHubResult.schemaCheck?.webUrl) {
          this.log(`View full report:\n${gitHubResult.schemaCheck.webUrl}`);
        }

        if (!gitHubResult.valid) {
          await handleFailedCheck(gitHubResult.schemaCheck?.id);
        }
      } else {
        throw new APIError(payload.message);
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
