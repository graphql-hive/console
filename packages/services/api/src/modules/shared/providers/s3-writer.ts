import { Injectable, Scope } from 'graphql-modules';
import { metrics } from '@hive/service-common';
import { AwsClient } from '../../cdn/providers/aws';
import { S3Config, S3Destination } from './s3-config';

export type S3WriteOperation =
  | 'app_deployment_enabled'
  | 'app_deployment_manifest'
  | 'artifact_latest'
  | 'artifact_versioned'
  | 'audit_log_export'
  | 'cdn_access_token'
  | 'debug_artifact'
  | 'persisted_document';

export type S3WriteMetric = {
  operation: S3WriteOperation;
  result: 'success' | 'failure';
  durationSeconds: number;
};

const s3Writes = new metrics.Counter({
  name: 'api_s3_writes_total',
  help: 'Number of S3-compatible object storage write attempts from the GraphQL API',
  labelNames: ['operation', 'result'],
});

const s3WriteDuration = new metrics.Histogram({
  name: 'api_s3_write_duration_seconds',
  help: 'Latency of S3-compatible object storage write attempts from the GraphQL API',
  labelNames: ['operation', 'result'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export function observeS3Write(metric: S3WriteMetric) {
  const labels = { operation: metric.operation, result: metric.result };
  s3Writes.inc(labels);
  s3WriteDuration.observe(labels, metric.durationSeconds);
}

type S3RequestInit = Parameters<AwsClient['fetch']>[1];

@Injectable({ scope: Scope.Singleton, global: true })
export class S3Writer {
  constructor(
    private s3Config: S3Config,
    private observer: (metric: S3WriteMetric) => void = observeS3Write,
  ) {}

  private async writeS3Object(
    s3: S3Destination,
    key: string,
    operation: S3WriteOperation,
    init: Omit<Parameters<AwsClient['fetch']>[1], 'method'>,
  ) {
    const startedAt = process.hrtime.bigint();
    let result: S3WriteMetric['result'] = 'failure';

    try {
      const response = await s3.client.fetch([s3.endpoint, s3.bucket, key].join('/'), {
        ...init,
        method: 'PUT',
      });
      result = response.ok ? 'success' : 'failure';
      return response;
    } finally {
      this.observer({
        operation,
        result,
        durationSeconds: Number(process.hrtime.bigint() - startedAt) / 1e9,
      });
    }
  }

  async write(key: string, operation: S3WriteOperation, init: Omit<S3RequestInit, 'method'>) {
    const responses = [];
    for (const destination of this.s3Config.destinations) {
      responses.push(await this.writeS3Object(destination, key, operation, init));
    }
    return responses;
  }

  writePrimary(key: string, operation: S3WriteOperation, init: Omit<S3RequestInit, 'method'>) {
    return this.writeS3Object(this.s3Config.destinations[0], key, operation, init);
  }

  async request(key: string, init: S3RequestInit) {
    const responses = [];
    for (const destination of this.s3Config.destinations) {
      responses.push(await destination.client.fetch(this.url(destination, key), init));
    }
    return responses;
  }

  primaryUrl(key: string) {
    return this.url(this.s3Config.destinations[0], key);
  }

  private url(destination: S3Destination, key: string) {
    return [destination.endpoint, destination.bucket, key].join('/');
  }
}
