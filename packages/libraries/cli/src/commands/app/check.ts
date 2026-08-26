import { buildSchema, GraphQLError, Kind, parse, Source, specifiedRules, validate } from 'graphql';
import type { DocumentNode, ValidationContext } from 'graphql';
import { Args, Errors, Flags } from '@oclif/core';
import Command from '../../base-command';
import * as GraphQLSchema from '../../gql/graphql';
import { FetchLatestVersionDocument } from '../../gql/graphql';
import { loadAppOperations } from '../../helpers/app-operations';
import { graphqlEndpoint } from '../../helpers/config';
import {
  InvalidDocumentsError,
  InvalidTargetError,
  MissingEndpointError,
  MissingRegistryTokenError,
  SchemaNotFoundError,
  UnexpectedError,
} from '../../helpers/errors';
import * as TargetInput from '../../helpers/target-input';
import { Texture } from '../../helpers/texture/texture';

function SingleOperationDefinitionRule(context: ValidationContext) {
  return {
    Document(node: DocumentNode) {
      const operations = node.definitions.filter(
        definition => definition.kind === Kind.OPERATION_DEFINITION && definition.name,
      );

      if (operations.length > 1) {
        context.reportError(
          new GraphQLError(
            'Multiple operation definitions found. Only one executable operation definition is allowed per document.',
            { nodes: operations },
          ),
        );
      }
    },
  };
}

export default class AppCheck extends Command<typeof AppCheck> {
  static description = 'checks app operations against the latest published schema';

  static flags = {
    'registry.endpoint': Flags.string({
      description: 'registry endpoint',
    }),
    'registry.accessToken': Flags.string({
      description: 'registry access token',
    }),
    target: Flags.string({
      description:
        'The target against which the app operations are checked.' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
  };

  static args = {
    operations: Args.string({
      name: 'operations',
      required: true,
      description:
        'Path to the persisted operations manifest (GraphQL Code Generator, Relay or Apollo persisted query manifest JSON file), a directory containing .graphql files, or a glob pattern matching .graphql files.',
      hidden: false,
    }),
  };

  async run() {
    try {
      const { flags, args } = await this.parse(AppCheck);
      let endpoint: string, accessToken: string;

      try {
        endpoint = this.ensure({
          key: 'registry.endpoint',
          args: flags,
          defaultValue: graphqlEndpoint,
          env: 'HIVE_REGISTRY',
          description: AppCheck.flags['registry.endpoint'].description!,
        });
      } catch (error) {
        this.logDebug(error);
        throw new MissingEndpointError();
      }

      try {
        accessToken = this.ensure({
          key: 'registry.accessToken',
          args: flags,
          env: 'HIVE_TOKEN',
          description: AppCheck.flags['registry.accessToken'].description!,
        });
      } catch (error) {
        this.logDebug(error);
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

      const { operations, warnings } = await loadAppOperations(args.operations);
      for (const warning of warnings) {
        this.warn(warning);
      }

      if (operations.length === 0) {
        this.logInfo('No operations found');
        return;
      }

      const result = await this.registryApi(endpoint, accessToken).request({
        operation: FetchLatestVersionDocument,
        variables: { target },
      });
      const sdl = result.latestValidVersion?.sdl;
      if (!sdl) {
        throw new SchemaNotFoundError();
      }

      const schema = buildSchema(sdl, {
        assumeValidSDL: true,
        assumeValid: true,
      });

      const invalidOperations = operations.flatMap(operation => {
        const source = operation.location
          ? `${operation.location} (${operation.operationHash})`
          : operation.operationHash;
        try {
          const document = parse(new Source(operation.content, source));
          const errors = validate(schema, document, [
            ...specifiedRules,
            SingleOperationDefinitionRule,
          ]);
          return errors.length > 0 ? [{ source, errors }] : [];
        } catch (error) {
          if (error instanceof GraphQLError) {
            return [{ source, errors: [error] }];
          }
          throw error;
        }
      });

      if (invalidOperations.length === 0) {
        this.logSuccess(`All operations are valid (${operations.length})`);
        return;
      }

      this.log(Texture.header('Summary'));
      this.log(
        [
          `Total: ${operations.length}`,
          `Invalid: ${invalidOperations.length} (${Math.floor(
            (invalidOperations.length / operations.length) * 100,
          )}%)`,
          '',
        ].join('\n'),
      );
      this.log(Texture.header('Details'));
      throw new InvalidDocumentsError(invalidOperations);
    } catch (error) {
      if (error instanceof Errors.CLIError) {
        throw error;
      }
      this.logFailure('Failed to validate operations');
      throw new UnexpectedError(error);
    }
  }
}
