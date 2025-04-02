import { Args, Errors, Flags, ux } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import * as GraphQLSchema from '../../gql/graphql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  APIError,
  InvalidTargetError,
  MissingEndpointError,
  MissingRegistryTokenError,
  UnexpectedError,
} from '../../helpers/errors';
import { renderErrors } from '../../helpers/schema';
import * as TargetInput from '../../helpers/target-input';

const schemaDeleteMutation = graphql(/* GraphQL */ `
  mutation schemaDelete($input: SchemaDeleteInput!) {
    schemaDelete(input: $input) {
      __typename
      ... on SchemaDeleteSuccess {
        valid
        changes {
          edges {
            node {
              criticality
              message
            }
          }
        }
        errors {
          ...RenderErrors_SchemaErrorConnectionFragment
        }
      }
      ... on SchemaDeleteError {
        valid
        errors {
          ...RenderErrors_SchemaErrorConnectionFragment
        }
      }
    }
  }
`);

export default class SchemaDelete extends Command<typeof SchemaDelete> {
  static description = 'deletes a schema';
  static flags = {
    'registry.endpoint': Flags.string({
      description: 'registry endpoint',
    }),
    /** @deprecated */
    registry: Flags.string({
      description: 'registry address',
      deprecated: {
        message: 'use --registry.accessToken instead',
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
    dryRun: Flags.boolean({
      description: 'Does not delete the service, only reports what it would have done.',
      default: false,
    }),
    confirm: Flags.boolean({
      description: 'Confirm deletion of the service',
      default: false,
    }),
    target: Flags.string({
      description:
        'The target to which to publish to (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
  };

  static args = {
    service: Args.string({
      name: 'service' as const,
      required: true,
      description: 'name of the service',
      hidden: false,
    }),
  };

  async run() {
    try {
      const { flags, args } = await this.parse(SchemaDelete);

      const service: string = args.service;

      if (!flags.confirm) {
        const confirmed = await ux.confirm(
          `Are you sure you want to delete "${service}" from the registry? (y/n)`,
        );

        if (!confirmed) {
          this.logInfo('Aborting');
          this.exit(0);
        }
      }

      let accessToken: string, endpoint: string;
      try {
        endpoint = this.ensure({
          key: 'registry.endpoint',
          args: flags,
          legacyFlagName: 'registry',
          defaultValue: graphqlEndpoint,
          env: 'HIVE_REGISTRY',
          description: SchemaDelete.flags['registry.endpoint'].description!,
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
          description: SchemaDelete.flags['registry.accessToken'].description!,
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

      const result = await this.registryApi(endpoint, accessToken).request({
        operation: schemaDeleteMutation,
        variables: {
          input: {
            serviceName: service,
            dryRun: flags.dryRun,
            target,
          },
        },
      });

      if (result.schemaDelete.__typename === 'SchemaDeleteSuccess') {
        this.logSuccess(`${service} deleted`);
        this.exit(0);
        return;
      }

      this.logFailure(`Failed to delete ${service}`);
      const errors = result.schemaDelete.errors;

      if (errors) {
        throw new APIError(renderErrors(errors));
      }
    } catch (error) {
      if (error instanceof Errors.CLIError) {
        throw error;
      } else {
        this.logFailure(`Failed to complete`);
        throw new UnexpectedError(error);
      }
    }
  }
}
