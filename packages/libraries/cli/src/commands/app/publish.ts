import { Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { ACCESS_TOKEN_MISSING } from '../../helpers/errors';
import { T } from '../../helpers/typebox/__';
import { Output } from '../../output/__';

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
  static output = [
    Output.defineSuccess('SuccessSkipAppPublish', {
      data: {
        name: T.StringNonEmpty,
        version: T.StringNonEmpty,
      },
      text(_, data, t) {
        t.warning(
          `App deployment "${data.name}@${data.version}" is already published. Skipping...`,
        );
      },
    }),
    Output.defineSuccess('SuccessAppPublish', {
      data: {
        name: T.StringNonEmpty,
        version: T.StringNonEmpty,
      },
      text(_, data, t) {
        t.success(`App deployment "${data.name}@${data.version}" published successfully.`);
      },
    }),
    Output.defineFailure('FailureAppPublish', {
      data: {
        message: T.String(),
      },
    }),
  ];

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
      message: ACCESS_TOKEN_MISSING,
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
        type: 'FailureAppPublish',
        message: result.error.message,
      });
    }

    // TODO: Improve Hive API by returning a union type.
    if (!result.ok) {
      throw new Error('Unknown error');
    }

    if (result.ok.isSkipped) {
      return this.success({
        type: 'SuccessSkipAppPublish',
        name: result.ok.activatedAppDeployment.name,
        version: result.ok.activatedAppDeployment.version,
      });
    }

    return this.success({
      type: 'SuccessAppPublish',
      name: result.ok.activatedAppDeployment.name,
      version: result.ok.activatedAppDeployment.version,
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
