import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { print } from 'graphql';
import { z } from 'zod';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadDocuments } from '@graphql-tools/load';
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
import { ActivateAppDeploymentMutation } from './publish';

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
    }),
    target: Flags.string({
      description:
        'The target in which the app deployment will be created.' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
    publish: Flags.boolean({
      description: 'Publish the app deployment after creation.',
      default: false,
    }),
  };

  static args = {
    operations: Args.string({
      name: 'operations',
      required: true,
      description:
        'Path to the persisted operations manifest (JSON file), a directory containing .graphql files, or a glob pattern matching .graphql files.',
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
      this.logDebug(e);
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
      this.logDebug(e);
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

    const version = flags.version ?? Math.random().toString(36).padEnd(9, '0').slice(2, 9);
    if (!flags.version) {
      this.log(`No version provided, using generated version: ${version}`);
    }

    const file: string = args.operations;

    let manifest: Record<string, string>;

    const isFile = (() => {
      try {
        return statSync(file).isFile();
      } catch {
        return false;
      }
    })();

    if (isFile) {
      const contents = this.readJSON(file);
      const operations: unknown = JSON.parse(contents);
      const validationResult = ManifestModel.safeParse(operations);
      if (validationResult.success === false) {
        throw new PersistedOperationsMalformedError(file);
      }
      manifest = validationResult.data;
    } else {
      // file is a glob or directory - generate the manifest in-memory
      const globPattern = (() => {
        try {
          if (statSync(file).isDirectory()) {
            return `${resolve(file)}/**/*.graphql`;
          }
        } catch {
          // not a directory, treat as a glob pattern as-is
        }
        return file;
      })();

      let sources;
      try {
        sources = await loadDocuments(globPattern, {
          loaders: [new GraphQLFileLoader()],
        });
      } catch (err) {
        this.error(
          `Failed to load GraphQL files from "${relative(process.cwd(), file)}": ${String(err)}`,
        );
      }

      if (sources.length === 0) {
        this.error(`No .graphql files found in "${relative(process.cwd(), file)}".`);
      }

      // sort by location to make the output deterministic
      sources.sort((a, b) => (a.location ?? '').localeCompare(b.location ?? ''));

      manifest = {};

      for (const source of sources) {
        const sourceFile = source.location ?? '<unknown>';
        if (!source.document) {
          this.warn(`Skipping empty operation in file "${relative(process.cwd(), sourceFile)}".`);
          continue;
        }
        const operation = print(source.document).replace('\n', ' ').replace(/\s+/g, ' ').trim();
        if (!operation) {
          this.warn(`Skipping empty operation in file "${relative(process.cwd(), sourceFile)}".`);
          continue;
        }
        const hash = createHash('sha256').update(operation).digest('hex');
        if (hash in manifest) {
          this.warn(
            `Hash collision detected for file "${relative(process.cwd(), sourceFile)}". The operation is identical to another operation already in the manifest. Skipping.`,
          );
          continue;
        }
        manifest[hash] = operation;
      }

      if (Object.keys(manifest).length === 0) {
        this.error(`No valid GraphQL operations found in "${relative(process.cwd(), file)}".`);
      }

      this.log(
        `Persisted documents manifest generated in-memory from discovered GraphQL operations under "${globPattern}".`,
      );
      this.log(JSON.stringify(manifest, null, 2));
    }

    const result = await this.registryApi(endpoint, accessToken).request({
      operation: CreateAppDeploymentMutation,
      variables: {
        input: {
          appName: flags['name'],
          appVersion: version,
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
        `App deployment "${flags['name']}@${version}" is "${result.createAppDeployment.ok.createdAppDeployment.status}". Skip uploading documents...`,
      );
      return;
    }

    const totalDocuments = Object.keys(manifest).length;

    this.log(
      `App deployment "${flags['name']}@${version}" is created pending document upload. Uploading documents...`,
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
              appVersion: version,
              documents: buffer,
            },
          },
        });

        if (result.addDocumentsToAppDeployment.error) {
          if (result.addDocumentsToAppDeployment.error.details) {
            const affectedOperation =
              buffer[result.addDocumentsToAppDeployment.error.details.index];

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

    for (const [hash, body] of Object.entries(manifest)) {
      buffer.push({ hash, body });
      counter++;
      await flush();
    }

    await flush(true);

    this.log(`\nApp deployment "${flags['name']}@${version}" (${counter} operations) created.`);
    if (!flags.publish) {
      this.log(`Activate it with the "hive app:publish" command.`);
      return;
    }

    this.log('Publishing app deployment...');
    const publishResult = await this.registryApi(endpoint, accessToken).request({
      operation: ActivateAppDeploymentMutation,
      variables: {
        input: {
          target,
          appName: flags['name'],
          appVersion: version,
        },
      },
    });

    if (publishResult.activateAppDeployment.error) {
      throw new APIError(publishResult.activateAppDeployment.error.message);
    }

    if (publishResult.activateAppDeployment.ok) {
      const deploymentName = `${publishResult.activateAppDeployment.ok.activatedAppDeployment.name}@${publishResult.activateAppDeployment.ok.activatedAppDeployment.version}`;
      if (publishResult.activateAppDeployment.ok.isSkipped) {
        this.warn(`\nApp deployment "${deploymentName}" is already published. Skipping...`);
      } else {
        this.log('\nApp deployment published successfully.');
      }
    }
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
