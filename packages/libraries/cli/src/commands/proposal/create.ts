import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import * as GraphQLSchema from '../../gql/graphql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  APIError,
  CommitRequiredError,
  GithubRepositoryRequiredError,
  InvalidTargetError,
  MissingEndpointError,
  MissingRegistryTokenError,
  SchemaFileEmptyError,
  SchemaFileNotFoundError,
  UnexpectedError,
} from '../../helpers/errors';
import { gitInfo } from '../../helpers/git';
import { loadSchema, minifySchema } from '../../helpers/schema';
import * as TargetInput from '../../helpers/target-input';

const proposeSchemaMutation = graphql(/* GraphQL */ `
  mutation proposeSchema($input: CreateSchemaProposalInput!) {
    createSchemaProposal(input: $input) {
      __typename
      ok {
        schemaProposal {
          id
        }
      }
      error {
        message
        ... on CreateSchemaProposalError {
          details {
            description
            title
          }
        }
      }
    }
  }
`);

export default class ProposalCreate extends Command<typeof ProposalCreate> {
  static description = 'Proposes a schema change';
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
    target: Flags.string({
      required: true,
      description:
        'The target against which to propose the schema (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
    title: Flags.string({
      required: true,
      description: 'Title of the proposal. This should be a short description of the change.',
    }),
    description: Flags.string({
      required: false,
      description:
        'Description of the proposal. This should be a more detailed explanation of the change.',
    }),
    draft: Flags.boolean({
      default: false,
      description:
        'Set to true to open the proposal as a Draft. This indicates the proposal is still in progress.',
    }),

    /** CLI Only supports service at a time right now. */
    service: Flags.string({
      description: 'service name (only for distributed schemas)',
    }),
    github: Flags.boolean({
      description: 'Connect with GitHub Application',
      default: false,
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
    url: Flags.string({
      description:
        'If checking a service, then you can optionally provide the service URL to see the difference in the supergraph during the check.',
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
      const { flags, args } = await this.parse(ProposalCreate);
      let target: GraphQLSchema.TargetReferenceInput | null = null;
      {
        const result = TargetInput.parse(flags.target);
        if (result.type === 'error') {
          throw new InvalidTargetError();
        }
        target = result.data;
      }

      const service = flags.service;
      const usesGitHubApp = flags.github === true;
      let endpoint: string, accessToken: string;
      try {
        endpoint = this.ensure({
          key: 'registry.endpoint',
          args: flags,
          legacyFlagName: 'registry',
          defaultValue: graphqlEndpoint,
          env: 'HIVE_REGISTRY',
          description: ProposalCreate.flags['registry.endpoint'].description!,
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
          description: ProposalCreate.flags['registry.accessToken'].description!,
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
          throw new CommitRequiredError();
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
        operation: proposeSchemaMutation,
        variables: {
          input: {
            target,
            title: flags.title,
            description: flags.description,
            isDraft: flags.draft,
            initialChecks: [
              {
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
                url: flags.url,
              },
            ],
          },
        },
      });

      if (result.createSchemaProposal.ok) {
        const id = result.createSchemaProposal.ok.schemaProposal.id;
        if (id) {
          this.logSuccess(`Created proposal ${id}.`);
        }

        if (result.createSchemaProposal.error) {
          throw new APIError(result.createSchemaProposal.error.message);
        }
      }
    } catch (error) {
      if (error instanceof Errors.CLIError) {
        throw error;
      } else {
        this.logFailure('Failed to create schema proposal');
        throw new UnexpectedError(error);
      }
    }
  }
}
