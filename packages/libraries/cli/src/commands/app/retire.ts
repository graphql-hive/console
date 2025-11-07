import { Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import * as GraphQLSchema from '../../gql/graphql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  APIError,
  InvalidTargetError,
  MissingEndpointError,
  MissingRegistryTokenError,
} from '../../helpers/errors';
import * as TargetInput from '../../helpers/target-input';

export default class AppRetire extends Command<typeof AppRetire> {
  static description = 'retire an app deployment';
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
    target: Flags.string({
      description:
        'The target in which the app deployment will be retired (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
  };

  async run() {
    const { flags } = await this.parse(AppRetire);

    let endpoint: string, accessToken: string;
    try {
      endpoint = this.ensure({
        key: 'registry.endpoint',
        args: flags,
        defaultValue: graphqlEndpoint,
        env: 'HIVE_REGISTRY',
        description: AppRetire.flags['registry.endpoint'].description!,
      });
    } catch (e) {
      throw new MissingEndpointError();
    }

    try {
      accessToken = this.ensure({
        key: 'registry.accessToken',
        args: flags,
        env: 'HIVE_TOKEN',
        description: AppRetire.flags['registry.accessToken'].description!,
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
      operation: RetireAppDeploymentMutation,
      variables: {
        input: {
          target,
          appName: flags['name'],
          appVersion: flags['version'],
        },
      },
    });

    if (result.retireAppDeployment.error) {
      throw new APIError(result.retireAppDeployment.error.message);
    }

    if (result.retireAppDeployment.ok) {
      const name = `${result.retireAppDeployment.ok.retiredAppDeployment.name}@${result.retireAppDeployment.ok.retiredAppDeployment.version}`;

      this.log(`App deployment "${name}" retired successfully.`);
    }
  }
}

const RetireAppDeploymentMutation = graphql(/* GraphQL */ `
  mutation RetireAppDeployment($input: RetireAppDeploymentInput!) {
    retireAppDeployment(input: $input) {
      ok {
        retiredAppDeployment {
          id
          name
          version
          status
        }
      }
      error {
        message
      }
    }
  }
`);
