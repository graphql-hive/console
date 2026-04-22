import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import * as GraphQLSchema from '../../gql/graphql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  InvalidTargetError,
  MissingEndpointError,
  MissingRegistryTokenError,
  UnexpectedError,
} from '../../helpers/errors';
import * as TargetInput from '../../helpers/target-input';

const CLI_GraphCloneMutation = graphql(/* GraphQL */ `
  mutation CLI_GraphClone($input: GraphCloneInput!) {
    graphClone(input: $input) {
      ok {
        newGraphUrl
      }
      error {
        message
      }
    }
  }
`);

export default class CloneGraph extends Command<typeof CloneGraph> {
  static description = 'clone a graph';
  static flags = {
    'registry.endpoint': Flags.string({
      description: 'registry endpoint',
    }),
    'registry.accessToken': Flags.string({
      description: 'registry access token',
    }),
    target: Flags.string({
      description:
        'The target to which to publish to (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
      required: true,
    }),
  };

  static args = {
    graphName: Args.string({
      name: 'graphName',
      required: true,
      description: 'The name of the new graph',
      hidden: false,
    }),
  };

  async run() {
    try {
      const { flags, args } = await this.parse(CloneGraph);

      await this.require(flags);

      let endpoint: string;
      let accessToken: string;
      try {
        endpoint = this.ensure({
          key: 'registry.endpoint',
          args: flags,
          defaultValue: graphqlEndpoint,
          env: 'HIVE_REGISTRY',
          description: CloneGraph.flags['registry.endpoint'].description!,
        });
      } catch (e) {
        this.logDebug(e);
        throw new MissingEndpointError();
      }
      try {
        accessToken = this.ensure({
          key: 'registry.accessToken',
          args: flags,
          env: 'HIVE_TOKEN',
          description: CloneGraph.flags['registry.accessToken'].description!,
        });
      } catch (e) {
        this.logDebug(e);
        throw new MissingRegistryTokenError();
      }

      let target: GraphQLSchema.TargetReferenceInput;
      {
        const result = TargetInput.parse(flags.target);
        if (result.type === 'error') {
          throw new InvalidTargetError();
        }
        target = result.data;
      }

      const result = await this.registryApi(endpoint, accessToken).request({
        operation: CLI_GraphCloneMutation,
        variables: {
          input: {
            target,
            newGraphName: args.graphName,
          },
        },
      });

      if (result.graphClone.ok) {
        this.logInfo(`Graph Cloned. View at ${result.graphClone.ok.newGraphUrl}`);
      }
      if (result.graphClone.error) {
        throw new Error(result.graphClone.error.message);
      }
    } catch (error) {
      if (error instanceof Errors.CLIError) {
        throw error;
      } else {
        this.logFailure('Failed to publish schema');
        throw new UnexpectedError(error instanceof Error ? error.message : JSON.stringify(error));
      }
    }
  }
}
