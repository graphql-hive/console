import { Injectable, Inject, Scope } from 'graphql-modules';
import { createHmac } from 'crypto';
import type { Span } from '@sentry/types';
import { HiveError } from '../../../shared/errors';
import { HttpClient } from '../../shared/providers/http-client';
import { Logger } from '../../shared/providers/logger';
import { sentry } from '../../../shared/sentry';
import { CDN_CONFIG } from './tokens';
import type { CDNConfig } from './tokens';

type CdnResourceType = 'schema' | 'supergraph' | 'metadata';

@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class CdnProvider {
  private logger: Logger;
  private encoder: TextEncoder;
  private secretKeyData: Uint8Array;

  constructor(logger: Logger, private httpClient: HttpClient, @Inject(CDN_CONFIG) private config: CDNConfig) {
    this.logger = logger.child({ source: 'CdnProvider' });
    this.encoder = new TextEncoder();
    this.secretKeyData = this.encoder.encode(this.config.authPrivateKey);
  }

  getCdnUrlForTarget(targetId: string): string {
    return `${this.config.baseUrl}/${targetId}`;
  }

  generateToken(targetId: string): string {
    return createHmac('sha256', this.secretKeyData).update(this.encoder.encode(targetId)).digest('base64');
  }

  pushToCDN(url: string, body: string, span?: Span): Promise<{ success: boolean }> {
    return this.httpClient.put<{ success: boolean }>(
      url,
      {
        headers: {
          'content-type': 'text/plain',
          authorization: `Bearer ${this.config.cloudflare.authToken}`,
        },
        body,
        responseType: 'json',
        retry: {
          limit: 3,
        },
        timeout: {
          request: 10_000,
        },
      },
      span
    );
  }

  @sentry('CdnProvider.publish')
  async publish(
    {
      targetId,
      resourceType,
      value,
    }: {
      targetId: string;
      resourceType: CdnResourceType;
      value: string;
    },
    span?: Span
  ): Promise<void> {
    const target = `target:${targetId}`;
    this.logger.info(`Publishing data to CDN based on target: "${target}", resourceType is: ${resourceType} ...`);
    const CDN_SOURCE = `${this.config.cloudflare.basePath}/${this.config.cloudflare.accountId}/storage/kv/namespaces/${this.config.cloudflare.namespaceId}/values/${target}`;

    this.logger.info(`Data published to CDN: ${value}`);
    const result = await this.pushToCDN(`${CDN_SOURCE}:${resourceType}`, value, span);

    if (!result.success) {
      return Promise.reject(new HiveError(`Failed to publish to CDN, response: ${JSON.stringify(result)}`));
    }

    this.logger.info(
      `Published to CDN based on target: "${target}", resourceType is: ${resourceType} is done, response: %o`,
      result
    );
  }
}
