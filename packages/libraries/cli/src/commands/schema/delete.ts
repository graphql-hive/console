import { Args, Flags, ux } from '@oclif/core';
import Command from '../../base-command';
import { Fragments } from '../../fragments/__';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { ACCESS_TOKEN_MISSING } from '../../helpers/errors';
import { casesExhausted } from '../../helpers/general';
import { InferInput } from '../../helpers/oclif';
import { Output } from '../../output/__';

const schemaDeleteMutation = graphql(/* GraphQL */ `
  mutation schemaDelete($input: SchemaDeleteInput!) {
    schemaDelete(input: $input) {
      __typename
      ... on SchemaDeleteSuccess {
        valid
        changes {
          nodes {
            criticality
            message
          }
          total
        }
        errors {
          nodes {
            message
          }
          total
        }
      }
      ... on SchemaDeleteError {
        valid
        errors {
          nodes {
            message
          }
          total
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
  };
  static args = {
    service: Args.string({
      name: 'service' as const,
      required: true,
      description: 'name of the service',
      hidden: false,
    }),
  };
  static output = [
    Output.defineSuccess('SuccessSchemaDelete', {
      data: {},
      text({ args }: InferInput<typeof SchemaDelete>, _, t) {
        t.success(`${args.service} deleted`);
      },
    }),
    Output.defineFailure('FailureSchemaDelete', {
      data: {
        errors: Output.Types.SchemaErrors,
      },
      text({ args }: InferInput<typeof SchemaDelete>, data, t) {
        t.failure(`Failed to delete ${args.service}`);
        t.line(Output.Types.schemaErrorsText(data.errors));
      },
    }),
  ];

  async runResult() {
    const { flags, args } = await this.parse(SchemaDelete);

    if (!flags.confirm) {
      const confirmed = await ux.confirm(
        `Are you sure you want to delete "${args.service}" from the registry? (y/n)`,
      );

      if (!confirmed) {
        this.logInfo('Aborting');
        this.exit(0);
      }
    }

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

    const result = await this.registryApi(endpoint, accessToken)
      .request({
        operation: schemaDeleteMutation,
        variables: {
          input: {
            serviceName: args.service,
            dryRun: flags.dryRun,
          },
        },
      })
      .then(_ => _.schemaDelete);

    if (result.__typename === 'SchemaDeleteSuccess') {
      return this.success({
        type: 'SuccessSchemaDelete',
      });
    }

    if (result.__typename === 'SchemaDeleteError') {
      return this.failure({
        type: 'FailureSchemaDelete',
        errors: Fragments.SchemaErrorConnection.toSchemaOutput(result.errors),
      });
    }

    throw casesExhausted(result);
  }
}
