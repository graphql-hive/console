import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import type { Logger } from '@graphql-hive/logger';
import { AwsClient, type S3CredentialProvider } from '@hive/cdn-script/aws';
import type { S3DestinationConfig } from '../../environment.js';

export type ObjectStorageDestination = {
  name: string;
  client: Pick<AwsClient, 'fetch'>;
  endpoint: string;
  bucketName: string;
};

export class ObjectStorageWriteError extends Error {
  constructor(method: string, destination: string, key: string, status: number) {
    super(`S3 ${method} failed with status ${status} (destination=${destination}, key=${key})`);
    this.name = 'ObjectStorageWriteError';
  }
}

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Narrow writer for the S3 compatible artifact storage (primary and optional mirror).
 * Every operation is applied to all destinations and fails if any destination fails, which gives
 * the same durability guarantees as the CDN artifacts written by the API service.
 */
export class ObjectStorageWriter {
  constructor(
    private destinations: Array<ObjectStorageDestination>,
    private logger: Logger,
  ) {}

  /** Creates a writer with an S3 client per destination config. */
  static fromConfigs(
    configs: Array<{ name: string; config: S3DestinationConfig }>,
    logger: Logger,
  ): ObjectStorageWriter {
    return new ObjectStorageWriter(
      configs.map(({ name, config }) => ({
        name,
        endpoint: config.endpoint,
        bucketName: config.bucketName,
        client: new AwsClient({
          credentialProvider: createCredentialProvider(config),
          service: 's3',
        }),
      })),
      logger,
    );
  }

  /**
   * Write an immutable (content addressed) object to every destination that does not have it yet.
   * Concurrent or repeated writes of the same key are harmless as the content is identical.
   */
  async putImmutable(key: string, body: Buffer, contentType: string): Promise<void> {
    await Promise.all(
      this.destinations.map(async destination => {
        if (await this.exists(destination, key)) {
          this.logger.debug({ destination: destination.name, key }, 'Object exists, skip upload');
          return;
        }
        await this.putToDestination(destination, key, body, contentType);
      }),
    );
  }

  /** Unconditionally write an object to every destination. */
  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await Promise.all(
      this.destinations.map(destination =>
        this.putToDestination(destination, key, body, contentType),
      ),
    );
  }

  private url(destination: ObjectStorageDestination, key: string) {
    return [destination.endpoint, destination.bucketName, key].join('/');
  }

  private async putToDestination(
    destination: ObjectStorageDestination,
    key: string,
    body: Buffer,
    contentType: string,
  ) {
    const response = await destination.client.fetch(this.url(destination, key), {
      method: 'PUT',
      headers: {
        'content-type': contentType,
        'content-length': String(body.length),
      },
      body,
      timeout: REQUEST_TIMEOUT_MS,
    });

    if (response.status !== 200) {
      throw new ObjectStorageWriteError('PUT', destination.name, key, response.status);
    }
  }

  private async exists(destination: ObjectStorageDestination, key: string) {
    const response = await destination.client.fetch(this.url(destination, key), {
      method: 'HEAD',
      timeout: REQUEST_TIMEOUT_MS,
    });

    if (response.status === 200) {
      return true;
    }
    if (response.status === 404) {
      return false;
    }
    throw new ObjectStorageWriteError('HEAD', destination.name, key, response.status);
  }
}

function createCredentialProvider(config: S3DestinationConfig): S3CredentialProvider {
  if (config.awsIamAuthEnabled) {
    const provider = fromNodeProviderChain();
    return { getCredentials: () => provider() };
  }

  const { accessKeyId, secretAccessKey, sessionToken } = config.credentials;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Static S3 credentials are required when AWS IAM auth is disabled.');
  }
  const credentials = { accessKeyId, secretAccessKey, sessionToken };
  return { getCredentials: async () => credentials };
}
