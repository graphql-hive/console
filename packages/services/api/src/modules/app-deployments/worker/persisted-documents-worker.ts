import { type MessagePort } from 'node:worker_threads';
import { AwsClient } from '../../cdn/providers/aws';
import type { S3CredentialProvider } from '../../cdn/providers/aws';
import { ClickHouse } from '../../operations/providers/clickhouse-client';
import { HttpClient } from '../../shared/providers/http-client';
import { Logger } from '../../shared/providers/logger';
import { S3Config } from '../../shared/providers/s3-config';
import { S3Writer } from '../../shared/providers/s3-writer';
import type { S3WriteMetric } from '../../shared/providers/s3-writer';
import {
  PersistedDocumentIngester,
  type BatchProcessedEvent,
  type BatchProcessEvent,
  type BatchProcessingErrorEvent,
} from '../providers/persisted-document-ingester';
import { serializeWorkerError } from '../providers/persisted-document-scheduler';

/**
 * Create a worker for processing incoming persisted operations.
 * Because we don't want to block the main thread on the API
 */
export function createWorker(
  port: MessagePort,
  baseLogger: Logger,
  env: {
    s3: {
      readonly bucketName: string;
      readonly endpoint: string;
      readonly credentialProvider: S3CredentialProvider;
    };
    s3Mirror: {
      readonly bucketName: string;
      readonly endpoint: string;
      readonly credentialProvider: S3CredentialProvider;
    } | null;
    clickhouse: {
      readonly host: string;
      readonly port: number;
      readonly protocol?: string;
      readonly username?: string;
      readonly password?: string;
    };
  },
) {
  const s3Config = new S3Config([
    {
      client: new AwsClient({
        credentialProvider: env.s3.credentialProvider,
        service: 's3',
      }),
      bucket: env.s3.bucketName,
      endpoint: env.s3.endpoint,
    },
    ...(env.s3Mirror
      ? [
          {
            client: new AwsClient({
              credentialProvider: env.s3Mirror.credentialProvider,
              service: 's3',
            }),
            bucket: env.s3Mirror.bucketName,
            endpoint: env.s3Mirror.endpoint,
          },
        ]
      : []),
  ]);

  const logger = baseLogger.child({
    source: 'PersistedDocumentsWorker',
  });

  const clickhouse = new ClickHouse(env.clickhouse, new HttpClient(), logger);

  process.on('unhandledRejection', function (err) {
    console.error('unhandledRejection', err);
    console.error(err);
    port.postMessage({
      code: 'ERROR',
      err,
    });
    process.exit(1);
  });

  process.on('uncaughtException', function (err) {
    console.error('uncaughtException', err);
    port.postMessage({
      code: 'ERROR',
      err,
    });
    process.exit(1);
  });

  port.on('message', async (message: BatchProcessEvent) => {
    logger.debug('processing message', message.id, message.event);
    const s3WriteMetrics: Array<S3WriteMetric> = [];
    const persistedOperationsProcessor = new PersistedDocumentIngester(
      clickhouse,
      new S3Writer(s3Config, metric => s3WriteMetrics.push(metric)),
      logger as any,
    );
    try {
      const result = await persistedOperationsProcessor.processBatch(message.data);
      logger.debug('send message result', message.id, message.event);
      port.postMessage({
        event: 'processedBatch',
        id: message.id,
        data: result,
        s3WriteMetrics,
      } satisfies BatchProcessedEvent);
    } catch (err: unknown) {
      logger.error(
        'unexpected error while processing message in worker (messageId=%s)',
        message.id,
      );
      logger.error(String(err));
      port.postMessage({
        event: 'error',
        id: message.id,
        error: serializeWorkerError(err),
        s3WriteMetrics,
      } satisfies BatchProcessingErrorEvent);
    }
  });

  process.on('exit', function (code) {
    console.log('exit', code);
  });
}
