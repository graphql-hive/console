import { Inject, Injectable, Scope } from 'graphql-modules';
import { type Redis } from 'ioredis';
import z from 'zod';
import { Logger } from '../../shared/providers/logger';
import { REDIS_INSTANCE } from '../../shared/providers/redis';
import { sha256 } from '../lib/supertokens-at-home/crypto';

@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class OAuthCache {
  private logger: Logger;

  constructor(
    @Inject(REDIS_INSTANCE) private redis: Redis,
    logger: Logger,
  ) {
    this.logger = logger.child({ module: 'OAuthCache' });
  }

  async put(state: string, data: Record) {
    const encodedData = JSON.stringify(data);
    const key = `oauth-cache:${sha256(state)}`;
    await this.redis.set(key, encodedData);
    await this.redis.expire(key, 60 * 5);
  }

  async get(state: string) {
    const key = `oauth-cache:${sha256(state)}`;
    const encodedData = await this.redis.getdel(key);
    if (!encodedData) {
      return null;
    }
    const data = RecordModel.parse(JSON.parse(encodedData));
    return data;
  }
}

const RecordModel = z.object({
  oidIntegrationId: z.string().nullable(),
  pkceVerifier: z.string(),
  method: z.string(),
});

type Record = z.TypeOf<typeof RecordModel>;
