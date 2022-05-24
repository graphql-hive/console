import { createTokenStorage, createConnectionString, tokens } from '@hive/storage';
import type { FastifyReply } from 'fastify';

export interface StorageItem {
  token: string;
  name: string;
  tokenAlias: string;
  date: string;
  lastUsedAt: string;
  organization: string;
  project: string;
  target: string;
  scopes: readonly string[];
}

export interface Storage {
  readTarget(targetId: string, res?: FastifyReply): Promise<StorageItem[]>;
  readToken(token: string, res?: FastifyReply): Promise<StorageItem>;
  writeToken(item: Omit<StorageItem, 'date' | 'lastUsedAt'>): Promise<StorageItem>;
  deleteToken(token: string): Promise<void>;
  touchTokens(tokens: Array<{ token: string; date: Date }>): Promise<void>;
}

export async function createStorage(): Promise<Storage> {
  const connectionString = createConnectionString(process.env as any);
  const db = await createTokenStorage(connectionString);

  function transformToken(item: tokens): StorageItem {
    return {
      token: item.token,
      tokenAlias: item.token_alias,
      name: item.name,
      date: item.created_at as any,
      lastUsedAt: item.last_used_at as any,
      organization: item.organization_id,
      project: item.project_id,
      target: item.target_id,
      scopes: item.scopes || [],
    };
  }

  return {
    async readTarget(target) {
      const tokens = await db.getTokens({ target });

      return tokens.map(transformToken);
    },
    async readToken(hashed_token) {
      const result = await db.getToken({ token: hashed_token });

      return transformToken(result);
    },
    async writeToken(item) {
      const result = await db.createToken(item);

      return transformToken(result);
    },
    async deleteToken(hashed_token) {
      return db.deleteToken({ token: hashed_token });
    },
    touchTokens(tokens) {
      return db.touchTokens({ tokens });
    },
  };
}
