import { createHash } from 'crypto';
import { z } from 'zod';
import { Args, Flags } from '@oclif/core';
import Command from '../../base-command';
import { graphql } from '../../gql';
import { AppDeploymentFormatType, AppDeploymentStatus } from '../../gql/graphql';
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
    showTiming: Flags.boolean({
      description: 'Show timing breakdown for each batch',
      default: false,
    }),
    format: Flags.string({
      description:
        'Storage format version. "v1" (default) uses per-version storage and allows any hash format. "v2" enables cross-version deduplication and requires sha256 hashes.',
      default: 'v1',
      options: ['v1', 'v2'],
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
    const startTime = Date.now();

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

    // Validate hashes are sha256 and match content (unless v1 format)
    if (flags.format !== 'v1') {
      const sha256Regex = /^(sha256:)?[a-f0-9]{64}$/i;
      const invalidFormatHashes: string[] = [];
      const mismatchedHashes: Array<{ hash: string; expected: string }> = [];

      for (const [hash, body] of Object.entries(validationResult.data)) {
        if (!sha256Regex.test(hash)) {
          invalidFormatHashes.push(hash);
        } else {
          // Verify hash matches content
          const computedHash = createHash('sha256').update(body).digest('hex');
          const providedHash = hash.replace(/^sha256:/i, '').toLowerCase();
          if (computedHash !== providedHash) {
            mismatchedHashes.push({ hash: providedHash, expected: computedHash });
          }
        }
      }

      if (invalidFormatHashes.length > 0) {
        const examples = invalidFormatHashes.slice(0, 3).join(', ');
        const more =
          invalidFormatHashes.length > 3 ? ` (and ${invalidFormatHashes.length - 3} more)` : '';
        throw new APIError(
          `Invalid hash format detected: ${examples}${more}\n` +
            `Hashes must be sha256 (64 hexadecimal characters, optionally prefixed with "sha256:").\n` +
            `This is required for safe cross-version document deduplication.\n` +
            `Use --format=v1 to bypass this check (disables cross-version deduplication).`,
        );
      }

      if (mismatchedHashes.length > 0) {
        const example = mismatchedHashes[0];
        const more =
          mismatchedHashes.length > 1 ? ` (and ${mismatchedHashes.length - 1} more)` : '';
        throw new APIError(
          `Hash does not match document content${more}.\n` +
            `Provided: ${example.hash}\n` +
            `Expected: ${example.expected}\n` +
            `Ensure your manifest uses sha256 hash of the raw document body.`,
        );
      }
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

    const allDocuments = Object.entries(validationResult.data);
    const totalDocuments = allDocuments.length;

    // Fetch existing hashes for delta upload
    let existingHashes = new Set<string>();
    if (flags.format !== 'v1') {
      if (!target) {
        throw new APIError(
          'The --target flag is required when using --format=v2 for delta optimization.',
        );
      }
      const hashesResult = await this.registryApi(endpoint, accessToken).request({
        operation: GetExistingDocumentHashesQuery,
        variables: {
          target,
          appName: flags['name'],
        },
      });

      if (hashesResult.target?.appDeploymentDocumentHashes.error) {
        this.logWarning(
          `Could not fetch existing document hashes: ${hashesResult.target.appDeploymentDocumentHashes.error.message}. Delta optimization disabled.`,
        );
      } else if (hashesResult.target?.appDeploymentDocumentHashes.ok?.hashes) {
        existingHashes = new Set(hashesResult.target.appDeploymentDocumentHashes.ok.hashes);
        if (flags.showTiming) {
          this.log(`Found ${existingHashes.size} existing documents (will skip)`);
        }
      } else if (!hashesResult.target) {
        this.logWarning(
          `Target not found when fetching existing hashes. Delta optimization disabled.`,
        );
      }
    }

    // Filter out already-existing documents
    const newDocuments = allDocuments.filter(([hash]) => !existingHashes.has(hash));
    const skippedCount = totalDocuments - newDocuments.length;

    if (newDocuments.length === 0) {
      this.log(
        `App deployment "${flags['name']}@${flags['version']}" - all ${totalDocuments} documents already exist. Nothing to upload.`,
      );
      this.log(
        `Note: The deployment is still in "pending" status. Run "hive app:publish --name=${flags['name']} --version=${flags['version']}" to activate it.`,
      );
      return;
    }

    this.log(
      `App deployment "${flags['name']}@${flags['version']}" is created pending document upload. Uploading ${newDocuments.length} new documents (${skippedCount} already exist)...`,
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
              format:
                flags.format === 'v1' ? AppDeploymentFormatType.V1 : AppDeploymentFormatType.V2,
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

        if (flags.showTiming && result.addDocumentsToAppDeployment.ok?.timing) {
          const t = result.addDocumentsToAppDeployment.ok.timing;
          this.log(
            `  Batch timing: ${t.totalMs}ms total (${t.documentsProcessed} docs, parse: ${t.parsingMs}ms, validate: ${t.validationMs}ms, coords: ${t.coordinateExtractionMs}ms, ch: ${t.clickhouseMs}ms, s3: ${t.s3Ms}ms)`,
          );
        }

        buffer = [];

        // don't bother showing 100% since there's another log line when it's done. And for deployments with just a few docs, showing this progress is unnecessary.
        if (counter !== newDocuments.length) {
          this.log(
            `${counter} / ${newDocuments.length} (${Math.round((100.0 * counter) / newDocuments.length)}%) documents uploaded...`,
          );
        }
      }
    };

    for (const [hash, body] of newDocuments) {
      buffer.push({ hash, body });
      counter++;
      await flush();
    }

    await flush(true);

    if (flags.showTiming) {
      const totalTime = Date.now() - startTime;
      this.log(`Total time: ${totalTime}ms`);
    }

    this.log(
      `\nApp deployment "${flags['name']}@${flags['version']}" (${counter} new, ${skippedCount} skipped) created.\nActivate it with the "hive app:publish" command.`,
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
        timing {
          totalMs
          parsingMs
          validationMs
          coordinateExtractionMs
          clickhouseMs
          s3Ms
          documentsProcessed
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

const GetExistingDocumentHashesQuery = graphql(/* GraphQL */ `
  query GetExistingDocumentHashes($target: TargetReferenceInput!, $appName: String!) {
    target(reference: $target) {
      appDeploymentDocumentHashes(appName: $appName) {
        ok {
          hashes
        }
        error {
          message
        }
      }
    }
  }
`);
