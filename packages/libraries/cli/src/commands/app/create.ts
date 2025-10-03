import { z } from 'zod';
import { Args, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { AppDeploymentStatus } from '../../gql/graphql';
import * as GraphQLSchema from '../../gql/graphql';
import { graphqlEndpoint } from '../../helpers/config';
import {
  APIError,
  InvalidTargetError,
  MissingEndpointError,
  MissingRegistryTokenError,
  PersistedOperationsMalformedError,
} from '../../helpers/errors';
import * as TargetInput from '../../helpers/target-input';

export default class AppCreate extends Command<typeof AppCreate> {
  static description = 'create an app deployment';
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
        'The target in which the app deployment will be created.' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
  };

  static args = {
    file: Args.string({
      name: 'file',
      required: true,
      description: 'Path to the persisted operations mapping.',
      hidden: false,
    }),
  };

  async run() {
    const { flags, args } = await this.parse(AppCreate);

    let endpoint: string, accessToken: string;
    try {
      endpoint = this.ensure({
        key: 'registry.endpoint',
        args: flags,
        defaultValue: graphqlEndpoint,
        env: 'HIVE_REGISTRY',
        description: AppCreate.flags['registry.endpoint'].description!,
      });
    } catch (e) {
      throw new MissingEndpointError();
    }

    try {
      accessToken = this.ensure({
        key: 'registry.accessToken',
        args: flags,
        env: 'HIVE_TOKEN',
        description: AppCreate.flags['registry.accessToken'].description!,
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

    const file: string = args.file;
    const contents = this.readJSON(file);
    const operations: unknown = JSON.parse(contents);
    const validationResult = ManifestModel.safeParse(operations);

    if (validationResult.success === false) {
      throw new PersistedOperationsMalformedError(file);
    }

    const result = await this.registryApi(endpoint, accessToken).request({
      operation: CreateAppDeploymentMutation,
      variables: {
        input: {
          appName: flags['name'],
          appVersion: flags['version'],
          target,
        },
      },
    });

    if (result.createAppDeployment.error) {
      throw new APIError(result.createAppDeployment.error.message);
    }

    if (!result.createAppDeployment.ok) {
      throw new APIError(`Create App failed without providing a reason.`);
    }

    if (result.createAppDeployment.ok.createdAppDeployment.status !== AppDeploymentStatus.Pending) {
      this.log(
        `App deployment "${flags['name']}@${flags['version']}" is "${result.createAppDeployment.ok.createdAppDeployment.status}". Skip uploading documents...`,
      );
      return;
    }

    const totalDocuments = Object.keys(validationResult.data).length;

    this.log(
      `App deployment "${flags['name']}@${flags['version']}" is created pending document upload. Uploading documents...`,
    );

    let buffer: Array<{ hash: string; body: string }> = [];

    let counter = 0;

    const flush = async (force = false) => {
      if (buffer.length >= 100 || (force && buffer.length > 0)) {
        const result = await this.registryApi(endpoint, accessToken).request({
          operation: AddDocumentsToAppDeploymentMutation,
          variables: {
            input: {
              target,
              appName: flags['name'],
              appVersion: flags['version'],
              documents: buffer,
            },
          },
        });

        if (result.addDocumentsToAppDeployment.error) {
          if (result.addDocumentsToAppDeployment.error.details) {
            const affectedOperation = buffer.at(
              result.addDocumentsToAppDeployment.error.details.index,
            );

            const maxCharacters = 40;

            if (affectedOperation) {
              const truncatedBody = (
                affectedOperation.body.length > maxCharacters - 3
                  ? affectedOperation.body.substring(0, maxCharacters) + '...'
                  : affectedOperation.body
              ).replace(/\n/g, '\\n');
              this.logWarning(
                `Failed uploading document: ${result.addDocumentsToAppDeployment.error.details.message}` +
                  `\nOperation hash: ${affectedOperation?.hash}` +
                  `\nOperation body: ${truncatedBody}`,
              );
            }
          }
          throw new APIError(result.addDocumentsToAppDeployment.error.message);
        }
        buffer = [];

        // don't bother showing 100% since there's another log line when it's done. And for deployments with just a few docs, showing this progress is unnecessary.
        if (counter !== totalDocuments) {
          this.log(
            `${counter} / ${totalDocuments} (${Math.round((100.0 * counter) / totalDocuments)}%) documents uploaded...`,
          );
        }
      }
    };

    for (const [hash, body] of Object.entries(validationResult.data)) {
      buffer.push({ hash, body });
      counter++;
      await flush();
    }

    await flush(true);

    this.log(
      `\nApp deployment "${flags['name']}@${flags['version']}" (${counter} operations) created.\nActive it with the "hive app:publish" command.`,
    );
  }
}

const ManifestModel = z.record(z.string());

const CreateAppDeploymentMutation = graphql(/* GraphQL */ `
  mutation CreateAppDeployment($input: CreateAppDeploymentInput!) {
    createAppDeployment(input: $input) {
      ok {
        createdAppDeployment {
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

const AddDocumentsToAppDeploymentMutation = graphql(/* GraphQL */ `
  mutation AddDocumentsToAppDeployment($input: AddDocumentsToAppDeploymentInput!) {
    addDocumentsToAppDeployment(input: $input) {
      ok {
        appDeployment {
          id
          name
          version
          status
        }
      }
      error {
        message
        details {
          index
          message
          __typename
        }
      }
    }
  }
`);
