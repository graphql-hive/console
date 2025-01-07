import { Args, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { ACCESS_TOKEN_MISSING } from '../../helpers/errors';
import { InferInput } from '../../helpers/oclif';
import { SchemaHive } from '../../helpers/schema';
import { T } from '../../helpers/typebox/__';
import { Output } from '../../output/__';

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
  };
  static args = {
    file: Args.string({
      name: 'file',
      required: true,
      description: 'Path to the persisted operations mapping.',
      hidden: false,
    }),
  };
  static output = [
    Output.defineSuccess('SuccessSkipAppCreate', {
      data: {
        status: Output.AppDeploymentStatus,
      },
      text(input: InferInput<typeof AppCreate>, output) {
        return `App deployment "${input.flags.name}@${input.flags.version}" is "${output.status}". Skip uploading documents...`;
      },
    }),
    Output.defineSuccess('SuccessAppCreate', {
      data: {
        id: T.StringNonEmpty,
        operationsCount: T.Number(),
      },
      text(args: InferInput<typeof AppCreate>, data, t) {
        t.line(
          `App deployment "${args.flags.name}@${args.flags.version}" (${data.operationsCount} operations) created.\nActivate it with the "hive app:publish" command.`,
        );
      },
    }),
    Output.defineFailure('FailureAppCreate', {
      data: {
        message: T.String(),
      },
    }),
    Output.defineFailure('FailureInvalidManifestModel', {
      data: {
        errors: T.Array(T.Value.MaterializedValueErrorT),
      },
    }),
  ];

  async runResult() {
    const { flags, args } = await this.parse(AppCreate);

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

    const file: string = args.file;
    const fs = await import('fs/promises');
    const contents = await fs.readFile(file, 'utf-8');
    const operations = T.Value.ParseJsonSafe(ManifestModel, contents);
    if (operations instanceof T.Value.AssertError) {
      return this.failure({
        type: 'FailureInvalidManifestModel',
        errors: T.Value.MaterializeValueErrorIterator(operations.Errors()),
      });
    }

    const result = await this.registryApi(endpoint, accessToken)
      .request({
        operation: CreateAppDeploymentMutation,
        variables: {
          input: {
            appName: flags['name'],
            appVersion: flags['version'],
          },
        },
      })
      .then(_ => _.createAppDeployment);

    if (result.error) {
      return this.failure({
        type: 'FailureAppCreate',
        message: result.error.message,
      });
    }

    // TODO: Improve Hive API by returning a union type.
    if (!result.ok) {
      throw new Error('Unknown error');
    }

    if (result.ok.createdAppDeployment.status !== SchemaHive.AppDeploymentStatus.Pending) {
      return this.success({
        type: 'SuccessSkipAppCreate',
        status: result.ok.createdAppDeployment.status,
      });
    }

    let buffer: Array<{ hash: string; body: string }> = [];

    const flush = async (force = false) => {
      if (buffer.length >= 100 || force) {
        const result = await this.registryApi(endpoint, accessToken)
          .request({
            operation: AddDocumentsToAppDeploymentMutation,
            variables: {
              input: {
                appName: flags['name'],
                appVersion: flags['version'],
                documents: buffer,
              },
            },
          })
          .then(_ => _.addDocumentsToAppDeployment);

        if (result.error) {
          if (result.error.details) {
            const affectedOperation = buffer.at(result.error.details.index);

            const maxCharacters = 40;

            if (affectedOperation) {
              const truncatedBody = (
                affectedOperation.body.length > maxCharacters - 3
                  ? affectedOperation.body.substring(0, maxCharacters) + '...'
                  : affectedOperation.body
              ).replace(/\n/g, '\\n');
              this.logWarning(
                `Failed uploading document: ${result.error.details.message}` +
                  `\nOperation hash: ${affectedOperation?.hash}` +
                  `\nOperation body: ${truncatedBody}`,
              );
            }
          }
          this.error(result.error.message);
        }
        buffer = [];
      }
    };

    let counter = 0;

    for (const [hash, body] of Object.entries(operations)) {
      buffer.push({ hash, body });
      await flush();
      counter++;
    }

    await flush(true);

    return this.success({
      type: 'SuccessAppCreate',
      id: result.ok.createdAppDeployment.id,
      operationsCount: counter,
    });
  }
}

const ManifestModel = T.Record(T.String(), T.String());

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
