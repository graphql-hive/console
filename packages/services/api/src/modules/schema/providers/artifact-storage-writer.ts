import { createHash } from 'node:crypto';
import { Injectable, Scope } from 'graphql-modules';
import z from 'zod';
import { buildArtifactStorageKey } from '@hive/cdn-script/artifact-storage-reader';
import { setErrorSource, traceFn } from '@hive/service-common';
import { Logger } from '../../shared/providers/logger';
import { S3Writer } from '../../shared/providers/s3-writer';

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

function extractContractName(contractName: string | null): null | string {
  if (contractName === null) {
    return null;
  }
  const parts = contractName.split('/');

  return parts[parts.length - 1] ?? null;
}

function buildHeaders(args: {
  contentType: string;
  graphId?: string | null;
  referenceDate: Date;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': args.contentType,
    'x-amz-meta-x-hive-updated-at': args.referenceDate.toUTCString(),
  };

  if (args.graphId) {
    headers['x-amz-meta-x-hive-graph-id'] = args.graphId;
  }

  return headers;
}

/**
 * Write an Artifact to an S3 bucket.
 */
@Injectable({ scope: Scope.Singleton, global: true })
export class ArtifactStorageWriter {
  private logger: Logger;

  constructor(
    private s3: S3Writer,
    logger: Logger,
  ) {
    this.logger = logger.child({ service: 'f' });
  }

  /**
   * Write an artifact that belongs to a schema version.
   * It is written to the versioned key first and then to the "latest" key.
   * This order ensures that if the versioned write fails, "latest" still points to the previous version.
   */
  @traceFn('CDN: Write Versioned Artifact', {
    initAttributes: args => ({
      'hive.target.id': args.targetId,
      'hive.artifact.type': args.artifactType,
      'hive.contract.name': args.contractName || '',
      'hive.version.id': args.versionId,
    }),
  })
  async writeVersionedArtifact(args: {
    targetId: string;
    artifactType: keyof typeof artifactMeta;
    artifact: unknown;
    contractName: null | string;
    versionId: string;
    /** versioned contracts are historically stored under the source graph ID */
    contractSourceSchemaVersionId?: string | null;
    graphId: string | null;
    /** When the artifact update was initiated. */
    referenceDate: Date;
  }) {
    const contractName = extractContractName(args.contractName);
    const latestKey = buildArtifactStorageKey(args.targetId, args.artifactType, contractName);
    const versionedKey = buildArtifactStorageKey(
      args.targetId,
      args.artifactType,
      contractName,
      args.contractSourceSchemaVersionId ?? args.versionId,
    );

    this.logger.debug(
      'Writing versioned artifact to S3 (targetId=%s, artifactType=%s, contractName=%s, versionId=%s, latestKey=%s, versionedKey=%s)',
      args.targetId,
      args.artifactType,
      args.contractName,
      args.versionId,
      latestKey,
      versionedKey,
    );

    const headers = buildHeaders({
      contentType: artifactMeta[args.artifactType].contentType,
      graphId: args.graphId,
      referenceDate: args.referenceDate,
    });
    // Store version ID as S3 object metadata for CDN response headers
    headers['x-amz-meta-x-hive-graph-version-id'] = args.versionId;
    headers['x-amz-meta-x-hive-schema-version-id'] = args.versionId;
    const body = artifactMeta[args.artifactType].preprocessor(args.artifact);

    await this.putObject({
      key: versionedKey,
      operation: 'artifact_versioned',
      headers,
      body,
      context: `targetId=${args.targetId}, artifactType=${args.artifactType}, contractName=${args.contractName}, versionId=${args.versionId}`,
    });

    await this.putObject({
      key: latestKey,
      operation: 'artifact_latest',
      headers,
      body,
      context: `targetId=${args.targetId}, artifactType=${args.artifactType}, contractName=${args.contractName}, versionId=${args.versionId}, versionedKey=${versionedKey} already written`,
    });
  }

  /**
   * Write the graph manifest of a target.
   * The manifest describes the latest state of all graphs and is therefore never versioned.
   */
  @traceFn('CDN: Write Graph Manifest', {
    initAttributes: args => ({
      'hive.target.id': args.targetId,
    }),
  })
  async writeGraphManifest(args: {
    targetId: string;
    manifest: z.TypeOf<typeof GraphManifestModel>;
    /** When the manifest update was initiated. */
    referenceDate: Date;
  }) {
    const key = buildArtifactStorageKey(args.targetId, 'manifest.json', null);

    this.logger.debug('Writing graph manifest to S3 (targetId=%s, key=%s)', args.targetId, key);

    await this.putObject({
      key,
      operation: 'artifact_latest',
      headers: buildHeaders({
        contentType: 'application/json',
        referenceDate: args.referenceDate,
      }),
      body: JSON.stringify(args.manifest),
      context: `targetId=${args.targetId}, artifactType=manifest.json`,
    });
  }

  private async putObject(args: {
    key: string;
    operation: 'artifact_versioned' | 'artifact_latest';
    headers: Record<string, string>;
    body: string;
    /** Included in the log and error message on failure. */
    context: string;
  }) {
    const results = await this.s3.write(args.key, args.operation, {
      headers: args.headers,
      body: args.body,
    });

    for (const result of results) {
      if (result.statusCode !== 200) {
        this.logger.error(
          'Failed to write artifact (operation=%s, key=%s, statusCode=%s, %s)',
          args.operation,
          args.key,
          result.statusCode,
          args.context,
        );
        throw setErrorSource(
          new Error(
            `Unexpected status code ${result.statusCode} when writing artifact (operation=${args.operation}, key=${args.key}, ${args.context})`,
          ),
          `s3 ${new URL(result.url).origin}`,
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
    const key = buildArtifactStorageKey(
      args.targetId,
      args.artifactType,
      extractContractName(args.contractName),
    );

    const results = await this.s3.request(key, {
      method: 'DELETE',
    });

    for (const result of results) {
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

  async writeSDLForDebugPurposes(subgraphs: Array<{ sdl: string; name?: string }>) {
    const hashBuilder = createHash('sha256');
    for (const subgraph of subgraphs) {
      hashBuilder.update(subgraph.sdl);
      if (subgraph.name) {
        hashBuilder.update(subgraph.name);
      }
    }

    const hash = hashBuilder.digest('hex');

    const key = `debug-artifacts/${hash}.json`;
    const url = this.s3.primaryUrl(key);

    await this.s3.writePrimary(key, 'debug_artifact', {
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(subgraphs),
    });

    return { id: hash.substring(0, 10), url };
  }
}

const GraphManifestGraph = z.object({
  id: z.string(),
  currentVersion: z.object({
    id: z.string(),
    artifactPath: z.string(),
  }),
});

const GraphManifestGraphs = z.record(z.string(), GraphManifestGraph);

export const GraphManifestModel = z.object({ graphs: GraphManifestGraphs });
