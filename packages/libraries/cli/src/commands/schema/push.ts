import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  APIError,
  InvalidTargetError,
  MissingArgumentsError,
  MissingEndpointError,
  MissingRegistryTokenError,
  UnexpectedError,
} from '../../helpers/errors';
import { loadSchemaSdl, minifySchema } from '../../helpers/schema';
import * as TargetInput from '../../helpers/target-input';

const schemaPushMutation = graphql(/* GraphQL */ `
  mutation CLI_SchemaPushMutation($input: SchemaPushInput!) {
    schemaPush(input: $input) {
      ok {
        isSkipped
        schemaRevision {
          service
          revision
          digest
          expiresAt
        }
      }
      error {
        message
      }
    }
  }
`);

export default class SchemaPush extends Command<typeof SchemaPush> {
  static description = 'pushes a schema revision for later publication';

  static flags = {
    target: Flags.string({
      required: true,
      description:
        'The target to push against as "$organizationSlug/$projectSlug/$targetSlug" or a target UUID.',
    }),
    service: Flags.string({
      description:
        'service name (required for federation and stitching projects, ignored for single-schema projects)',
    }),
    revision: Flags.string({
      required: true,
      description: 'immutable schema revision, such as a commit SHA',
    }),
    'registry.endpoint': Flags.string({ description: 'registry endpoint' }),
    registry: Flags.string({
      description: 'registry address',
      deprecated: { message: 'use --registry.endpoint instead', version: '0.21.0' },
    }),
    'registry.accessToken': Flags.string({ description: 'registry access token' }),
    token: Flags.string({
      description: 'api token',
      deprecated: { message: 'use --registry.accessToken instead', version: '0.21.0' },
    }),
    require: Flags.string({
      description:
        'Loads specific require.extensions before running the codegen and reading the configuration',
      default: [],
      multiple: true,
    }),
  };

  static args = {
    file: Args.string({
      name: 'file',
      required: true,
      description: 'Path to the schema file(s)',
    }),
  };

  async run() {
    try {
      const { flags, args } = await this.parse(SchemaPush);
      await this.require(flags);

      let endpoint: string;
      let accessToken: string;
      try {
        endpoint = this.ensure({
          key: 'registry.endpoint',
          args: flags,
          legacyFlagName: 'registry',
          defaultValue: graphqlEndpoint,
          env: 'HIVE_REGISTRY',
          description: SchemaPush.flags['registry.endpoint'].description!,
        });
      } catch (error) {
        throw error instanceof MissingArgumentsError ? new MissingEndpointError() : error;
      }
      try {
        accessToken = this.ensure({
          key: 'registry.accessToken',
          args: flags,
          legacyFlagName: 'token',
          env: 'HIVE_TOKEN',
          description: SchemaPush.flags['registry.accessToken'].description!,
        });
      } catch (error) {
        throw error instanceof MissingArgumentsError ? new MissingRegistryTokenError() : error;
      }

      const target = TargetInput.parse(flags.target);
      if (target.type === 'error') {
        throw new InvalidTargetError();
      }

      const sdl = minifySchema(await loadSchemaSdl(args.file, { logger: this.logger }));

      const result = await this.registryApi(endpoint, accessToken).request({
        operation: schemaPushMutation,
        variables: {
          input: {
            target: target.data,
            service: flags.service,
            revision: flags.revision,
            sdl,
          },
        },
        timeout: 55_000,
      });

      if (result.schemaPush.error) {
        throw new APIError(`Revision rejected by the server: ${result.schemaPush.error.message}`);
      }
      if (!result.schemaPush.ok) {
        throw new APIError('Schema push returned no result.');
      }

      const { isSkipped, schemaRevision: revision } = result.schemaPush.ok;
      const revisionName = `${revision.service ? `${revision.service}@` : ''}${revision.revision}`;

      if (flags.service && !revision.service) {
        this.warn(
          `The "--service" flag was ignored, because the project uses a single schema without services.`,
        );
      }

      if (isSkipped) {
        this.warn(
          `Schema revision "${revisionName}" already exists with the same schema. Skipping...`,
        );
      } else {
        this.logSuccess('Schema revision pushed.');
      }
      if (revision.service) {
        this.logInfo(`Service: ${revision.service}`);
      }
      this.logInfo(`Revision: ${revision.revision}`);
      this.logInfo(`Digest: ${revision.digest}`);
      if (revision.expiresAt) {
        this.logInfo(`Expires: ${revision.expiresAt} (unless published before then)`);
      }
    } catch (error) {
      if (error instanceof Errors.CLIError) {
        throw error;
      }
      this.logFailure('Failed to push schema revision');
      throw new UnexpectedError(error instanceof Error ? error.message : JSON.stringify(error));
    }
  }
}
