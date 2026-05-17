import z from 'zod';
import { Errors, Flags } from '@oclif/core';
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

const CLI_SchemaVersionPromoteMutation = graphql(/* GraphQL */ `
  mutation CLI_SchemaVersionPromoteMutation($input: SchemaVersionPromoteInput!) {
    schemaVersionPromote(input: $input) {
      ok {
        newSchemaVersion {
          id
        }
      }
      error {
        message
      }
    }
  }
`);

export default class SchemaPromote extends Command<typeof SchemaPromote> {
  static description = 'promote a schema version';
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
    from: Flags.string({
      description:
        'The target to which the schema version should be promoted from (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
    version: Flags.string({
      description:
        'The specific schema version ID to promote. It must be within the same project as the target the version should be promoted to.',
    }),
    to: Flags.string({
      description:
        'The target to which the schema version should be promoted to (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
      required: true,
    }),
  };

  async run() {
    try {
      const { flags } = await this.parse(SchemaPromote);

      let accessToken: string, endpoint: string;
      try {
        endpoint = this.ensure({
          key: 'registry.endpoint',
          args: flags,
          legacyFlagName: 'registry',
          defaultValue: graphqlEndpoint,
          env: 'HIVE_REGISTRY',
          description: SchemaPromote.flags['registry.endpoint'].description!,
        });
      } catch (e) {
        this.logDebug(e);
        throw new MissingEndpointError();
      }
      try {
        accessToken = this.ensure({
          key: 'registry.accessToken',
          args: flags,
          legacyFlagName: 'token',
          env: 'HIVE_TOKEN',
          description: SchemaPromote.flags['registry.accessToken'].description!,
        });
      } catch (e) {
        this.logDebug(e);
        throw new MissingRegistryTokenError();
      }

      let toTarget: GraphQLSchema.TargetReferenceInput | null = null;
      if (flags.to) {
        const result = TargetInput.parse(flags.to);
        if (result.type === 'error') {
          throw new InvalidTargetError('--to');
        }
        toTarget = result.data;
      }

      if (!toTarget) {
        throw new Error('Could not determine target to which to promote to.');
      }

      let fromTarget: GraphQLSchema.TargetReferenceInput | null = null;
      if (flags.from) {
        const result = TargetInput.parse(flags.from);
        if (result.type === 'error') {
          throw new InvalidTargetError('--from');
        }
        fromTarget = result.data;
      }

      let fromSchemaVersionById: string | null = null;

      if (flags.version) {
        const result = z.string().uuid().safeParse(flags.version);
        if (result.error) {
          throw new Error('Invalid UUID provided for "--version"');
        }
        fromSchemaVersionById = result.data;
      }

      if (fromTarget && fromSchemaVersionById) {
        throw new Error('Either provide "--from" or "--version", not both.');
      }

      const result = await this.registryApi(endpoint, accessToken).request({
        operation: CLI_SchemaVersionPromoteMutation,
        variables: {
          input: {
            source: fromTarget
              ? { fromTarget }
              : fromSchemaVersionById
                ? { fromSchemaVersionById }
                : (() => {
                    throw new Error('Provide either "--from" or "--version".');
                  })(),
            target: {
              toTarget,
            },
          },
        },
      });

      if (result.schemaVersionPromote.error) {
        this.logFailure(result.schemaVersionPromote.error.message);
        this.exit(1);
        return;
      }

      if (result.schemaVersionPromote.ok) {
        this.logSuccess(
          `Version ${result.schemaVersionPromote.ok.newSchemaVersion.id.substring(0, 8)} was created.`,
        );
        this.logSuccess('Schema Version successfully promoted.');

        // if (result.schemaVersionPromote.ok.linkToWebsite) {
        //   this.logInfo(`Available at ${result.schemaVersionPromote.linkToWebsite}`);
        // }
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
