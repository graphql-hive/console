import { Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { APIError, MissingEndpointError, MissingRegistryTokenError } from '../../helpers/errors';

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

  async run() {
    const { flags } = await this.parse(AppPublish);

    let endpoint: string, accessToken: string;
    try {
      endpoint = this.ensure({
        key: 'registry.endpoint',
        args: flags,
        defaultValue: graphqlEndpoint,
        env: 'HIVE_REGISTRY',
        description: AppPublish.flags['registry.endpoint'].description!,
      });
    } catch (e) {
      throw new MissingEndpointError();
    }

    try {
      accessToken = this.ensure({
        key: 'registry.accessToken',
        args: flags,
        env: 'HIVE_TOKEN',
        description: AppPublish.flags['registry.accessToken'].description!,
      });
    } catch (e) {
      throw new MissingRegistryTokenError();
    }

    const result = await this.registryApi(endpoint, accessToken).request({
      operation: ActivateAppDeploymentMutation,
      variables: {
        input: {
          appName: flags['name'],
          appVersion: flags['version'],
        },
      },
    });

    if (result.activateAppDeployment.error) {
      throw new APIError(result.activateAppDeployment.error.message);
    }

    if (result.activateAppDeployment.ok) {
      const name = `${result.activateAppDeployment.ok.activatedAppDeployment.name}@${result.activateAppDeployment.ok.activatedAppDeployment.version}`;

      if (result.activateAppDeployment.ok.isSkipped) {
        this.warn(`App deployment "${name}" is already published. Skipping...`);
        return;
      }
      this.log(`App deployment "${name}" published successfully.`);
    }
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
