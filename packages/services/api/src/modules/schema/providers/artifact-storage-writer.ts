import { Inject } from 'graphql-modules';
import { buildArtifactStorageKey } from '@hive/cdn-script/artifact-storage-reader';
import { traceFn } from '@hive/service-common';
import { Logger } from '../../shared/providers/logger';
import { S3_CONFIG, type S3Config } from '../../shared/providers/s3-config';

const artifactMeta = {
  sdl: {
    contentType: 'text/plain',
    preprocessor: (rawValue: unknown) => String(rawValue),
  },
  supergraph: {
    contentType: 'text/plain',
    preprocessor: (rawValue: unknown) => String(rawValue),
  },
  metadata: {
    contentType: 'application/json',
    preprocessor: (rawValue: unknown) => JSON.stringify(rawValue),
  },
  services: {
    contentType: 'application/json',
    preprocessor: (rawValue: unknown) => JSON.stringify(rawValue),
  },
} as const;

/**
 * Write an Artifact to an S3 bucket.
 */
export class ArtifactStorageWriter {
  private logger: Logger;

  constructor(
    @Inject(S3_CONFIG) private s3Mirrors: S3Config,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: 'f' });
  }

  @traceFn('CDN: Write Artifact', {
    initAttributes: args => ({
      'hive.target.id': args.targetId,
      'hive.artifact.type': args.artifactType,
      'hive.contract.name': args.contractName || '',
      'hive.version.id': args.versionId || '',
    }),
  })
  async writeArtifact(args: {
    targetId: string;
    artifactType: keyof typeof artifactMeta;
    artifact: unknown;
    contractName: null | string;
    versionId?: string | null;
  }) {
    const latestKey = buildArtifactStorageKey(args.targetId, args.artifactType, args.contractName);
    const versionedKey = args.versionId
      ? buildArtifactStorageKey(args.targetId, args.artifactType, args.contractName, args.versionId)
      : null;
    const meta = artifactMeta[args.artifactType];
    const body = meta.preprocessor(args.artifact);

    for (const s3 of this.s3Mirrors) {
      this.logger.debug(
        'Writing artifact to S3 (targetId=%s, artifactType=%s, contractName=%s, versionId=%s, latestKey=%s, versionedKey=%s)',
        args.targetId,
        args.artifactType,
        args.contractName,
        args.versionId,
        latestKey,
        versionedKey,
      );

      // Write versioned key first (if versionId provided)
      // This order ensures that if versioned write fails, "latest" still points to the previous version
      if (versionedKey && args.versionId) {
        const versionedResult = await s3.client.fetch(
          [s3.endpoint, s3.bucket, versionedKey].join('/'),
          {
            method: 'PUT',
            headers: {
              'content-type': meta.contentType,
              // Store version ID as S3 object metadata for CDN response headers
              'x-amz-meta-x-hive-schema-version-id': args.versionId,
            },
            body,
            aws: {
              signQuery: true,
            },
          },
        );

        if (versionedResult.statusCode !== 200) {
          this.logger.error(
            'Failed to write versioned artifact (targetId=%s, artifactType=%s, versionId=%s, key=%s, statusCode=%s)',
            args.targetId,
            args.artifactType,
            args.versionId,
            versionedKey,
            versionedResult.statusCode,
          );
          throw new Error(
            `Unexpected status code ${versionedResult.statusCode} when writing versioned artifact (targetId=${args.targetId}, artifactType=${args.artifactType}, versionId=${args.versionId}, key=${versionedKey})`,
          );
        }
      }

      // Write to latest key (always) - only after versioned succeeds
      const latestResult = await s3.client.fetch([s3.endpoint, s3.bucket, latestKey].join('/'), {
        method: 'PUT',
        headers: {
          'content-type': meta.contentType,
          // Store version ID as S3 object metadata for CDN response headers
          ...(args.versionId ? { 'x-amz-meta-x-hive-schema-version-id': args.versionId } : {}),
        },
        body,
        aws: {
          // This boolean makes Google Cloud Storage & AWS happy.
          signQuery: true,
        },
      });

      if (latestResult.statusCode !== 200) {
        this.logger.error(
          'Failed to write latest artifact after versioned succeeded (targetId=%s, artifactType=%s, versionId=%s, versionedKey=%s written, latestKey=%s failed)',
          args.targetId,
          args.artifactType,
          args.versionId,
          versionedKey,
          latestKey,
        );
        throw new Error(
          `Unexpected status code ${latestResult.statusCode} when writing latest artifact (targetId=${args.targetId}, artifactType=${args.artifactType}, contractName=${args.contractName}, key=${latestKey}). Note: versioned artifact was already written.`,
        );
      }
    }
  }

  @traceFn('CDN: Delete Artifact', {
    initAttributes: args => ({
      'hive.target.id': args.targetId,
      'hive.artifact.type': args.artifactType,
      'hive.contract.name': args.contractName || '',
    }),
  })
  async deleteArtifact(args: {
    targetId: string;
    artifactType: keyof typeof artifactMeta;
    contractName: null | string;
  }) {
    this.logger.debug(
      'Attempt deleting artifact. (targetId=%s, contractName=%s, artifactType=%s)',
      args.targetId,
      args.artifactType,
      args.contractName,
    );
    const key = buildArtifactStorageKey(args.targetId, args.artifactType, args.contractName);

    for (const s3 of this.s3Mirrors) {
      const result = await s3.client.fetch([s3.endpoint, s3.bucket, key].join('/'), {
        method: 'DELETE',
        aws: {
          // This boolean makes Google Cloud Storage & AWS happy.
          signQuery: true,
        },
      });

      if (result.statusCode !== 204) {
        this.logger.debug(
          'Failed deleting artifact, S3 compatible storage returned unexpected status code. (targetId=%s, contractName=%s, artifactType=%s, statusCode=%s)',
          args.targetId,
          args.artifactType,
          args.contractName,
          result.statusCode,
        );
        throw new Error(`Unexpected status code ${result.statusCode} when deleting artifact.`);
      }
    }

    this.logger.debug(
      'Successfully deleted artifact. (targetId=%s, contractName=%s, artifactType=%s)',
      args.targetId,
      args.artifactType,
      args.contractName,
    );
  }
}
