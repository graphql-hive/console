import { Args, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { graphqlEndpoint } from '../../helpers/config';
import { SchemaHive } from '../../helpers/schema';
import { tb } from '../../helpers/typebox/__';
import { SchemaOutput } from '../../schema-output/__';

export default class AppCreate extends Command<typeof AppCreate> {
  static parameters = {
    named: tb.Object({
      name: tb.String(),
      version: tb.String(),
      json: tb.Optional(tb.Boolean()),
      'registry.endpoint': tb.Optional(tb.String()),
      'registry.accessToken': tb.Optional(tb.String()),
    }),
    positional: tb.Tuple([tb.String()]),
  };
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
  static output = SchemaOutput.output(
    SchemaOutput.success({
      __typename: tb.Literal('CLISkipAppCreate'),
      status: SchemaOutput.AppDeploymentStatus,
    }),
    SchemaOutput.success({
      __typename: tb.Literal('CreateAppDeploymentOk'),
      id: tb.StringNonEmpty,
    }),
    SchemaOutput.failure({
      __typename: tb.Literal('CreateAppDeploymentError'),
      message: tb.String(),
    }),
  );

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
    });

    const file: string = args.file;
    const fs = await import('fs/promises');
    const contents = await fs.readFile(file, 'utf-8');
    // TODO: better error message if parsing fails :)
    const operations = tb.Value.ParseJson(ManifestModel, contents);

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
        __typename: 'CreateAppDeploymentError',
        message: result.error.message,
      });
    }

    // TODO: Improve Hive API by returning a union type.
    if (!result.ok) {
      throw new Error('Unknown error');
    }

    if (result.ok.createdAppDeployment.status !== SchemaHive.AppDeploymentStatus.Pending) {
      const message = `App deployment "${flags['name']}@${flags['version']}" is "${result.ok.createdAppDeployment.status}". Skip uploading documents...`;
      this.log(message);
      return this.successEnvelope({
        message,
        data: {
          __typename: 'CLISkipAppCreate',
          status: result.ok.createdAppDeployment.status,
        },
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

    const message = `App deployment "${flags['name']}@${flags['version']}" (${counter} operations) created.\nActivate it with the "hive app:publish" command.`;
    this.log(message);
    return this.successEnvelope({
      message,
      data: {
        __typename: 'CreateAppDeploymentOk',
        id: result.ok.createdAppDeployment.id,
      },
    });
  }
}

const ManifestModel = tb.Record(tb.String(), tb.String());

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
