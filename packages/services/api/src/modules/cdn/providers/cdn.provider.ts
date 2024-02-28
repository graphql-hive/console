import bcryptjs from 'bcryptjs';
import { Inject, Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { encodeCdnToken, generatePrivateKey } from '@hive/cdn-script/cdn-token';
import { crypto } from '@whatwg-node/fetch';
import { HiveError } from '../../../shared/errors';
import { isUUID } from '../../../shared/is-uuid';
import { AuthManager } from '../../auth/providers/auth-manager';
import { TargetAccessScope } from '../../auth/providers/scopes';
import type { Contract } from '../../schema/providers/contracts';
import { Logger } from '../../shared/providers/logger';
import { S3_CONFIG, type S3Config } from '../../shared/providers/s3-config';
import { Storage } from '../../shared/providers/storage';
import { CDN_CONFIG, type CDNConfig } from './tokens';

const s3KeyPrefix = 'cdn-keys';

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class CdnProvider {
  private logger: Logger;

  constructor(
    logger: Logger,
    @Inject(AuthManager) private authManager: AuthManager,
    @Inject(CDN_CONFIG) private config: CDNConfig,
    @Inject(S3_CONFIG) private s3Config: S3Config,
    @Inject(Storage) private storage: Storage,
  ) {
    this.logger = logger.child({ source: 'CdnProvider' });
  }

  isEnabled(): boolean {
    return this.config.providers.api !== null || this.config.providers.cloudflare !== null;
  }

  getCdnUrlForTarget(targetId: string): string {
    if (this.config.providers.cloudflare) {
      return `${this.config.providers.cloudflare.baseUrl}/artifacts/v1/${targetId}`;
    }
    if (this.config.providers.api) {
      return `${this.config.providers.api.baseUrl}/artifacts/v1/${targetId}`;
    }

    throw new HiveError(`CDN is not configured, cannot resolve CDN target url.`);
  }

  getCdnUrlForContract(contract: Contract): string {
    if (this.config.providers.cloudflare) {
      return `${this.config.providers.cloudflare.baseUrl}/artifacts/v1/${contract.targetId}/contracts/${contract.contractName}`;
    }
    if (this.config.providers.api) {
      return `${this.config.providers.api.baseUrl}/artifacts/v1/${contract.targetId}/contracts/${contract.contractName}`;
    }

    throw new HiveError(`CDN is not configured, cannot resolve CDN contract url.`);
  }

  async createCDNAccessToken(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    alias: string;
  }) {
    this.logger.debug(
      'Creating CDN Access Token. (organizationId=%s, projectId=%s, targetId=%s)',
      args.organizationId,
      args.projectId,
      args.targetId,
    );

    const alias = AliasStringModel.safeParse(args.alias);

    if (alias.success === false) {
      this.logger.debug(
        'Failed creating CDN Access Token. Validation failed. (organizationId=%s, projectId=%s, targetId=%s)',
        args.organizationId,
        args.projectId,
        args.targetId,
      );

      return {
        type: 'failure',
        reason: alias.error.issues[0].message,
      } as const;
    }

    await this.authManager.ensureTargetAccess({
      organization: args.organizationId,
      project: args.projectId,
      target: args.targetId,
      scope: TargetAccessScope.READ,
    });

    // generate all things upfront so we do net get surprised by encoding issues after writing to the destination.
    const keyId = crypto.randomUUID();
    const s3Key = `${s3KeyPrefix}/${args.targetId}/${keyId}`;
    const privateKey = generatePrivateKey();
    const privateKeyHash = await bcryptjs.hash(privateKey, await bcryptjs.genSalt());
    const cdnAccessToken = encodeCdnToken({ keyId, privateKey });

    this.logger.debug(
      'Check CDN access token key availability on S3. (organizationId=%s, projectId=%s, targetId=%s, key=%s)',
      args.organizationId,
      args.projectId,
      args.targetId,
      s3Key,
    );

    // Check if key already exists
    const headResponse = await this.s3Config.client.fetch(
      [this.s3Config.endpoint, this.s3Config.bucket, s3Key].join('/'),
      {
        method: 'HEAD',
        aws: {
          // This boolean makes Google Cloud Storage & AWS happy.
          signQuery: true,
        },
      },
    );

    if (headResponse.status !== 404) {
      this.logger.debug(
        'Failed creating CDN access token. Head request on S3 returned unexpected status while checking token availability. (organizationId=%s, projectId=%s, targetId=%s, status=%s)',
        args.organizationId,
        args.projectId,
        args.targetId,
        headResponse.status,
      );
      this.logger.debug(await headResponse.text());

      return {
        type: 'failure',
        reason: 'Failed to generate key. Please try again later.',
      } as const;
    }

    this.logger.debug(
      'Store CDN access token on S3. (organizationId=%s, projectId=%s, targetId=%s, key=%s)',
      args.organizationId,
      args.projectId,
      args.targetId,
      s3Key,
    );

    // put key onto s3 bucket
    const putResponse = await this.s3Config.client.fetch(
      [this.s3Config.endpoint, this.s3Config.bucket, s3Key].join('/'),
      {
        method: 'PUT',
        body: privateKeyHash,
        aws: {
          // This boolean makes Google Cloud Storage & AWS happy.
          signQuery: true,
        },
      },
    );

    if (putResponse.status !== 200) {
      this.logger.debug(
        'Failed creating CDN Access Token. Head request on S3 returned unexpected status while creating token. (organizationId=%s, projectId=%s, targetId=%s, status=%s)',
        args.organizationId,
        args.projectId,
        args.targetId,
        headResponse.status,
      );
      this.logger.error(await putResponse.text());

      return {
        type: 'failure',
        reason: 'Failed to generate key. Please try again later. 2',
      } as const;
    }

    this.logger.debug(
      'Successfully stored CDN access token on S3. (organizationId=%s, projectId=%s, targetId=%s, key=%s)',
      args.organizationId,
      args.projectId,
      args.targetId,
      s3Key,
    );

    this.logger.debug(
      'Insert CDN access token into PG. (organizationId=%s, projectId=%s, targetId=%s, key=%s)',
      args.organizationId,
      args.projectId,
      args.targetId,
      s3Key,
    );

    const cdnAccessTokenRecord = await this.storage.createCDNAccessToken({
      id: keyId,
      targetId: args.targetId,
      firstCharacters: cdnAccessToken.substring(0, 5),
      lastCharacters: cdnAccessToken.substring(cdnAccessToken.length - 5, cdnAccessToken.length),
      s3Key,
      alias: args.alias,
    });

    if (cdnAccessTokenRecord === null) {
      this.logger.error(
        'Failed inserting CDN access token in PG. (organizationId=%s, projectId=%s, targetId=%s, key=%s)',
        args.organizationId,
        args.projectId,
        args.targetId,
        s3Key,
      );

      return {
        type: 'failure',
        reason: 'Failed to generate key. Please try again later.',
      } as const;
    }

    this.logger.debug(
      'Successfully created CDN access token. (organizationId=%s, projectId=%s, targetId=%s, key=%s, cdnAccessTokenId=%s)',
      args.organizationId,
      args.projectId,
      args.targetId,
      s3Key,
      cdnAccessTokenRecord.id,
    );

    return {
      type: 'success',
      cdnAccessToken: cdnAccessTokenRecord,
      secretAccessToken: cdnAccessToken,
    } as const;
  }

  public async deleteCDNAccessToken(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    cdnAccessTokenId: string;
  }) {
    this.logger.debug(
      'Delete CDN access token. (organizationId=%s, projectId=%s, targetId=%s, cdnAccessTokenId=%s)',
      args.organizationId,
      args.projectId,
      args.targetId,
      args.cdnAccessTokenId,
    );

    await this.authManager.ensureTargetAccess({
      organization: args.organizationId,
      project: args.projectId,
      target: args.targetId,
      scope: TargetAccessScope.SETTINGS,
    });

    if (isUUID(args.cdnAccessTokenId) === false) {
      this.logger.debug(
        'Delete CDN access token error. Non UUID provided. (organizationId=%s, projectId=%s, targetId=%s, cdnAccessTokenId=%s)',
        args.organizationId,
        args.projectId,
        args.targetId,
        args.cdnAccessTokenId,
      );

      return {
        type: 'failure',
        reason: 'The CDN Access Token does not exist.',
      } as const;
    }

    // TODO: this should probably happen within a db transaction to ensure integrity
    const record = await this.storage.getCDNAccessTokenById({
      cdnAccessTokenId: args.cdnAccessTokenId,
    });

    if (record === null || record.targetId !== args.targetId) {
      this.logger.debug(
        'Delete CDN access token error. Access Token not found in database. (organizationId=%s, projectId=%s, targetId=%s, cdnAccessTokenId=%s)',
        args.organizationId,
        args.projectId,
        args.targetId,
        args.cdnAccessTokenId,
      );
      return {
        type: 'failure',
        reason: 'The CDN Access Token does not exist.',
      } as const;
    }

    const headResponse = await this.s3Config.client.fetch(
      [this.s3Config.endpoint, this.s3Config.bucket, record.s3Key].join('/'),
      {
        method: 'DELETE',
        aws: {
          // This boolean makes Google Cloud Storage & AWS happy.
          signQuery: true,
        },
      },
    );

    if (headResponse.status !== 204) {
      this.logger.debug(
        'Delete CDN access token error. Head request on S3 failed. (organizationId=%s, projectId=%s, targetId=%s, cdnAccessTokenId=%s)',
        args.organizationId,
        args.projectId,
        args.targetId,
        args.cdnAccessTokenId,
      );

      return {
        type: 'failure',
        reason: 'Failed deleting CDN Access Token. Please try again later.',
      } as const;
    }

    await this.storage.deleteCDNAccessToken({
      cdnAccessTokenId: args.cdnAccessTokenId,
    });

    return {
      type: 'success',
    } as const;
  }

  public async getPaginatedCDNAccessTokensForTarget(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    first: number | null;
    cursor: string | null;
  }) {
    await this.authManager.ensureTargetAccess({
      organization: args.organizationId,
      project: args.projectId,
      target: args.targetId,
      scope: TargetAccessScope.SETTINGS,
    });

    const paginatedResult = await this.storage.getPaginatedCDNAccessTokensForTarget({
      targetId: args.targetId,
      first: args.first,
      cursor: args.cursor,
    });

    return paginatedResult;
  }
}

const AliasStringModel = z
  .string()
  .min(3, 'Must be at least 3 characters long.')
  .max(100, 'Can not be longer than 100 characters.');
