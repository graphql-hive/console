import { createHash } from 'crypto';
import { buildSchema, DocumentNode, GraphQLError, Kind, parse, TypeInfo, validate } from 'graphql';
import PromiseQueue from 'p-queue';
import { z } from 'zod';
import { collectSchemaCoordinates, preprocessOperation } from '@graphql-hive/core';
import {
  buildOperationS3BucketKey,
  buildOperationS3BucketKeyV2,
} from '@hive/cdn-script/artifact-storage-reader';
import { ServiceLogger } from '@hive/service-common';
import { sql as c_sql, ClickHouse } from '../../operations/providers/clickhouse-client';
import { S3Config } from '../../shared/providers/s3-config';

const parseS3Concurrency = (): number => {
  const value = process.env.S3_UPLOAD_CONCURRENCY;
  if (!value) return 100;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 1) {
    throw new Error(
      `Invalid S3_UPLOAD_CONCURRENCY: "${value}". Must be a positive integer.`,
    );
  }
  return parsed;
};

const S3_UPLOAD_CONCURRENCY = parseS3Concurrency();

type DocumentRecord = {
  appDeploymentId: string;
  /** hash as provided by the user */
  hash: string;
  /** hash as used by usage reporting */
  internalHash: string;
  body: string;
  operationName: string | null;
  schemaCoordinates: Array<string>;
};

export type ProcessingTiming = {
  totalMs: number;
  parsingMs: number;
  validationMs: number;
  coordinateExtractionMs: number;
  clickhouseMs: number;
  s3Ms: number;
  documentsProcessed: number;
};


const AppDeploymentOperationHashModel = z
  .string()
  .trim()
  .regex(
    /^(sha256:)?[a-f0-9]{64}$/i,
    'Hash must be a sha256 hash (64 hexadecimal characters, optionally prefixed with "sha256:"). ' +
      'This is required for safe cross-version document deduplication.',
  );


const AppDeploymentOperationHashModelLegacy = z
  .string()
  .trim()
  .min(1, 'Hash must be at least 1 characters long')
  .max(128, 'Hash must be at most 128 characters long')
  .regex(
    /^([A-Za-z]|[0-9]|_|-)+$/,
    "Operation hash can only contain letters, numbers, '_', and '-'",
  );

const AppDeploymentOperationBodyModel = z.string().min(3, 'Body must be at least 3 character long');

export type BatchProcessEvent = {
  event: 'PROCESS';
  id: string;
  data: {
    schemaSdl: string;
    targetId: string;
    appDeployment: {
      id: string;
      name: string;
      version: string;
    };
    documents: ReadonlyArray<{ hash: string; body: string }>;
    isV1Format?: boolean;
  };
};

export type BatchProcessedEvent = {
  event: 'processedBatch';
  id: string;
  data:
    | {
        type: 'error';
        error: {
          message: string;
          details: {
            /** index of the operation causing an issue */
            index: number;
            /** message with additional details (either parse or validation error) */
            message: string;
          };
        };
      }
    | {
        type: 'success';
        timing: ProcessingTiming;
      };
};

/**
 * Callback invoked when documents are successfully persisted to S3.
 * Can be used to prefill a Redis cache during deployment.
 *
 * @example
 * ```typescript
 * const onDocumentsPersisted: OnDocumentsPersistedCallback = async (documents) => {
 *   for (const { key, body } of documents) {
 *     await redis.set(`hive:pd:${key}`, body, { EX: 3600 });
 *   }
 * };
 * ```
 */
export type OnDocumentsPersistedCallback = (
  documents: Array<{
    key: string; // targetId~appName~appVersion~hash
    body: string;
  }>,
) => Promise<void>;

export class PersistedDocumentIngester {
  private promiseQueue = new PromiseQueue({ concurrency: S3_UPLOAD_CONCURRENCY });
  private logger: ServiceLogger;

  constructor(
    private clickhouse: ClickHouse,
    private s3: S3Config,
    logger: ServiceLogger,
    private onDocumentsPersisted?: OnDocumentsPersistedCallback,
  ) {
    this.logger = logger.child({ source: 'PersistedDocumentIngester' });
  }

  async processBatch(data: BatchProcessEvent['data']) {
    this.logger.debug(
      'Processing batch. (targetId=%s, appDeploymentId=%s, operationCount=%d)',
      data.targetId,
      data.appDeployment.id,
      data.documents.length,
    );

    const timingStart = performance.now();
    let parsingMs = 0;
    let validationMs = 0;
    let coordinateExtractionMs = 0;

    const schema = buildSchema(data.schemaSdl);
    const typeInfo = new TypeInfo(schema);
    const documents: Array<DocumentRecord> = [];

    // Use different hash validation based on format (V1 allows any hash, V2 requires sha256)
    const hashModel = data.isV1Format
      ? AppDeploymentOperationHashModelLegacy
      : AppDeploymentOperationHashModel;

    let index = 0;
    for (const operation of data.documents) {
      const hashValidation = hashModel.safeParse(operation.hash);
      const bodyValidation = AppDeploymentOperationBodyModel.safeParse(operation.body);

      if (hashValidation.success === false || bodyValidation.success === false) {
        this.logger.debug(
          'Invalid operation provided. Processing failed. (targetId=%s, appDeploymentId=%s, operationIndex=%d)',
          data.targetId,
          data.appDeployment.id,
          index,
        );

        return {
          type: 'error' as const,
          error: {
            message: 'Invalid input, please check the operations.',
            details: {
              index,
              message:
                hashValidation.error?.issues[0].message ??
                bodyValidation.error?.issues[0].message ??
                'Invalid hash or body provided',
            },
          },
        };
      }

      // For v2 format, verify hash matches content (sha256 of body)
      if (!data.isV1Format) {
        const computedHash = createHash('sha256').update(operation.body).digest('hex');
        const providedHash = operation.hash.replace(/^sha256:/i, '').toLowerCase();

        if (computedHash !== providedHash) {
          this.logger.debug(
            'Hash does not match document content. (targetId=%s, appDeploymentId=%s, operationIndex=%d)',
            data.targetId,
            data.appDeployment.id,
            index,
          );

          return {
            type: 'error' as const,
            error: {
              message: 'Hash does not match document content.',
              details: {
                index,
                message: `Expected sha256: ${computedHash}, got: ${providedHash}`,
              },
            },
          };
        }
      }

      let documentNode: DocumentNode;
      const parseStart = performance.now();
      try {
        documentNode = parse(operation.body);
      } catch (err) {
        if (err instanceof GraphQLError) {
          this.logger.debug(
            { err },
            'Failed parsing GraphQL operation. (targetId=%s, appDeploymentId=%s, operationIndex=%d)',
            data.targetId,
            data.appDeployment.id,
            index,
          );

          return {
            type: 'error' as const,
            error: {
              message: 'Failed to parse a GraphQL operation.',
              details: {
                index,
                message: err.message,
              },
            },
          };
        }
        throw err;
      }
      parsingMs += performance.now() - parseStart;
      const validateStart = performance.now();
      const errors = validate(schema, documentNode, undefined, {
        maxErrors: 1,
      });
      validationMs += performance.now() - validateStart;

      if (errors.length > 0) {
        this.logger.debug(
          'GraphQL operation did not pass validation against latest valid schema version. (targetId=%s, appDeploymentId=%s, operationIndex=%d)',
          data.targetId,
          data.appDeployment.id,
          index,
        );

        return {
          type: 'error' as const,
          error: {
            message: 'The GraphQL operation is not valid against the latest schema version.',
            details: {
              index,
              message: errors[0].message,
            },
          },
        };
      }

      const operationNames = getOperationNames(documentNode);
      if (operationNames.length > 1) {
        return {
          type: 'error' as const,
          error: {
            message: 'Only one executable operation definition is allowed per document.',
            details: {
              index,
              message:
                'Multiple operation definitions found. Only one executable operation definition is allowed per document.',
            },
          },
        };
      }

      const operationName = operationNames[0] ?? null;

      const coordsStart = performance.now();
      const schemaCoordinates = collectSchemaCoordinates({
        documentNode,
        processVariables: false,
        variables: null,
        schema,
        typeInfo,
      });
      coordinateExtractionMs += performance.now() - coordsStart;

      const normalizedOperation = preprocessOperation({
        document: documentNode,
        operationName,
        schemaCoordinates,
      });

      documents.push({
        appDeploymentId: data.appDeployment.id,
        hash: operation.hash,
        internalHash: normalizedOperation?.hash ?? operation.hash,
        body: operation.body,
        operationName,
        schemaCoordinates: Array.from(schemaCoordinates),
      });

      index++;
    }

    let clickhouseMs = 0;
    let s3Ms = 0;

    if (documents.length) {
      this.logger.debug(
        'inserting documents into clickhouse and s3. (targetId=%s, appDeployment=%s, documentCount=%d)',
        data.targetId,
        data.appDeployment.id,
        documents.length,
      );

      const timing = await this.insertDocuments({
        targetId: data.targetId,
        appDeployment: data.appDeployment,
        documents: documents,
        isV1Format: data.isV1Format,
      });
      clickhouseMs = timing.clickhouseMs;
      s3Ms = timing.s3Ms;
    }

    const totalMs = performance.now() - timingStart;

    return {
      type: 'success' as const,
      timing: {
        totalMs: Math.round(totalMs),
        parsingMs: Math.round(parsingMs),
        validationMs: Math.round(validationMs),
        coordinateExtractionMs: Math.round(coordinateExtractionMs),
        clickhouseMs: Math.round(clickhouseMs),
        s3Ms: Math.round(s3Ms),
        documentsProcessed: documents.length,
      },
    };
  }

  private async insertClickHouseDocuments(args: {
    targetId: string;
    appDeployment: {
      id: string;
    };
    documents: Array<DocumentRecord>;
  }) {
    // 1. Insert into ClickHouse
    this.logger.debug(
      'Inserting documents into ClickHouse. (targetId=%s, appDeployment=%s, documentCount=%d)',
      args.targetId,
      args.appDeployment.id,
      args.documents.length,
    );

    await this.clickhouse.insert({
      query: c_sql`
        INSERT INTO "app_deployment_documents" (
          "app_deployment_id"
          , "document_hash"
          , "document_body"
          , "operation_name"
          , "schema_coordinates"
          , "hash"
        )
        FORMAT CSV`,
      data: args.documents.map(document => [
        document.appDeploymentId,
        document.hash,
        document.body,
        document.operationName ?? '',
        document.schemaCoordinates,
        document.internalHash,
      ]),
      timeout: 10_000,
      queryId: 'insert_app_deployment_documents',
    });

    this.logger.debug(
      'Inserting documents into ClickHouse finished. (targetId=%s, appDeployment=%s, documentCount=%d)',
      args.targetId,
      args.appDeployment.id,
      args.documents.length,
    );
  }

  private async insertS3Documents(args: {
    targetId: string;
    appDeployment: {
      id: string;
      name: string;
      version: string;
    };
    documents: Array<DocumentRecord>;
    isV1Format?: boolean;
  }) {
    this.logger.debug(
      'Inserting documents into S3. (targetId=%s, appDeployment=%s, documentCount=%d, isV1Format=%s)',
      args.targetId,
      args.appDeployment.id,
      args.documents.length,
      args.isV1Format ?? false,
    );

    /** We parallelize and queue the requests. */
    const tasks: Array<Promise<void>> = [];

    for (const document of args.documents) {
      const s3Key = args.isV1Format
        ? buildOperationS3BucketKey(
            args.targetId,
            args.appDeployment.name,
            args.appDeployment.version,
            document.hash,
          )
        : buildOperationS3BucketKeyV2(args.targetId, args.appDeployment.name, document.hash);

      tasks.push(
        this.promiseQueue.add(async () => {
          for (const s3 of this.s3) {
            try {
              const response = await s3.client.fetch([s3.endpoint, s3.bucket, s3Key].join('/'), {
                method: 'PUT',
                headers: {
                  'content-type': 'text/plain',
                },
                body: document.body,
                aws: {
                  // This boolean makes Google Cloud Storage & AWS happy.
                  signQuery: true,
                },
              });

              if (response.statusCode !== 200) {
                this.logger.error(
                  { statusCode: response.statusCode, statusMessage: response.statusMessage, s3Key },
                  'Failed to upload document to S3. (targetId=%s, appDeploymentId=%s, documentHash=%s, endpoint=%s)',
                  args.targetId,
                  args.appDeployment.id,
                  document.hash,
                  s3.endpoint,
                );
                throw new Error(
                  `Failed to upload operation to S3: [${response.statusCode}] ${response.statusMessage} (key: ${s3Key})`,
                );
              }
            } catch (err) {
              if (err instanceof Error && err.message.includes('Failed to upload operation')) {
                throw err;
              }
              this.logger.error(
                { err, s3Key },
                'S3 upload failed unexpectedly. (targetId=%s, appDeploymentId=%s, documentHash=%s)',
                args.targetId,
                args.appDeployment.id,
                document.hash,
              );
              throw err;
            }
          }
        }),
      );
    }

    await Promise.all(tasks);

    this.logger.debug(
      'Inserting documents into S3 finished. (targetId=%s, appDeployment=%s, documentCount=%d)',
      args.targetId,
      args.appDeployment.id,
      args.documents.length,
    );

    // Trigger cache prefill callback if configured
    if (this.onDocumentsPersisted) {
      const docsForCache = args.documents.map(doc => ({
        // Key format matches what the SDK uses for lookups: targetId~appName~appVersion~hash
        key: `${args.targetId}~${args.appDeployment.name}~${args.appDeployment.version}~${doc.hash}`,
        body: doc.body,
      }));

      try {
        await this.onDocumentsPersisted(docsForCache);
        this.logger.debug(
          'Cache prefill callback completed. (targetId=%s, appDeployment=%s, documentCount=%d)',
          args.targetId,
          args.appDeployment.id,
          docsForCache.length,
        );
      } catch (err) {
        // Don't fail the deployment for cache prefill failures
        this.logger.error(
          { err },
          'Cache prefill callback failed. (targetId=%s, appDeployment=%s, documentCount=%d)',
          args.targetId,
          args.appDeployment.id,
          docsForCache.length,
        );
      }
    }
  }

  /** inserts operations of an app deployment into clickhouse and s3 */
  private async insertDocuments(args: {
    targetId: string;
    appDeployment: {
      id: string;
      name: string;
      version: string;
    };
    documents: Array<DocumentRecord>;
    isV1Format?: boolean;
  }): Promise<{ clickhouseMs: number; s3Ms: number }> {
    const [clickhouseMs, s3Ms] = await Promise.all([
      (async () => {
        const start = performance.now();
        await this.insertClickHouseDocuments(args);
        return performance.now() - start;
      })(),
      (async () => {
        const start = performance.now();
        await this.insertS3Documents({ ...args, isV1Format: args.isV1Format });
        return performance.now() - start;
      })(),
    ]);

    return { clickhouseMs, s3Ms };
  }
}

function getOperationNames(query: DocumentNode): Array<string> {
  const names: Array<string> = [];
  for (const node of query.definitions) {
    if (node.kind === Kind.OPERATION_DEFINITION && node.name?.value) {
      names.push(node.name.value);
    }
  }

  return names;
}
