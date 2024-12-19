import { Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { tb } from '../../helpers/typebox/__';
import { SchemaOutput } from '../../schema-output/__';

export default class AppPublish extends Command<typeof AppPublish> {
  static description = 'publish an app deployment';
  static flags = {
    'registry.endpoint': Flags.string({
      description: 'registry endpoint',
    }),
    'registry.accessToken': Flags.string({
      description: 'registry access token',
    }),
    name: Flags.string({
      description: 'app name',
      required: true,
    }),
    version: Flags.string({
      description: 'app version',
      required: true,
    }),
  };
  static output = SchemaOutput.output(
    SchemaOutput.success({
      __typename: tb.Literal('CLISkipAppPublish'),
      name: tb.StringNonEmpty,
      version: tb.StringNonEmpty,
    }),
    SchemaOutput.success({
      __typename: tb.Literal('ActivateAppDeploymentOk'),
      name: tb.StringNonEmpty,
      version: tb.StringNonEmpty,
    }),
    SchemaOutput.failure({
      __typename: tb.Literal('ActivateAppDeploymentError'),
      message: tb.String(),
    }),
  );

  async runResult() {
    const { flags } = await this.parse(AppPublish);

    const endpoint = this.ensure({
      key: 'registry.endpoint',
      args: flags,
      defaultValue: graphqlEndpoint,
      env: 'HIVE_REGISTRY',
    });
    const accessToken = this.ensure({
      key: 'registry.accessToken',
      args: flags,
      env: 'HIVE_TOKEN',
    });

    const result = await this.registryApi(endpoint, accessToken)
      .request({
        operation: ActivateAppDeploymentMutation,
        variables: {
          input: {
            appName: flags['name'],
            appVersion: flags['version'],
          },
        },
      })
      .then(_ => _.activateAppDeployment);

    if (result.error) {
      return this.failure({
        __typename: 'ActivateAppDeploymentError',
        message: result.error.message,
      });
    }

    // TODO: Improve Hive API by returning a union type.
    if (!result.ok) {
      throw new Error('Unknown error');
    }

    const name = `${result.ok.activatedAppDeployment.name}@${result.ok.activatedAppDeployment.version}`;

    if (result.ok.isSkipped) {
      const message = `App deployment "${name}" is already published. Skipping...`;
      this.warn(message);
      return this.successEnvelope({
        message,
        data: {
          __typename: 'CLISkipAppPublish',
          name: result.ok.activatedAppDeployment.name,
          version: result.ok.activatedAppDeployment.version,
        },
      });
    }

    const message = `App deployment "${name}" published successfully.`;
    this.log(message);
    return this.successEnvelope({
      message,
      data: {
        __typename: 'ActivateAppDeploymentOk',
        name: result.ok.activatedAppDeployment.name,
        version: result.ok.activatedAppDeployment.version,
      },
    });
  }
}

const ActivateAppDeploymentMutation = graphql(/* GraphQL */ `
  mutation ActivateAppDeployment($input: ActivateAppDeploymentInput!) {
    activateAppDeployment(input: $input) {
      ok {
        activatedAppDeployment {
          id
          name
          version
          status
        }
        isSkipped
      }
      error {
        message
      }
    }
  }
`);
