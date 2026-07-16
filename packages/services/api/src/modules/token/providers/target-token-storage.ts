import { createHash } from 'node:crypto';
import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql, type CommonQueryMethods } from '@hive/postgres';

const TokenModel = z.object({
  token: z.string(),
  tokenAlias: z.string(),
  name: z.string(),
  date: z.string(),
  lastUsedAt: z.string().nullable(),
  organization: z.string(),
  project: z.string(),
  target: z.string(),
  scopes: z.array(z.string()),
});

const tokenFields = psql`
  "token"
  , "token_alias" AS "tokenAlias"
  , "name"
  , to_json("created_at") AS "date"
  , to_json("last_used_at") AS "lastUsedAt"
  , "organization_id" AS "organization"
  , "project_id" AS "project"
  , "target_id" AS "target"
  , COALESCE("scopes", ARRAY[]::text[]) AS "scopes"
`;

export function hashTargetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class TargetTokenStorage {
  constructor(private pool: PostgresDatabasePool) {}

  async createToken(args: Omit<z.TypeOf<typeof TokenModel>, 'date' | 'lastUsedAt'>) {
    return await this.pool
      .one(
        psql`
      INSERT INTO "tokens" (
        "name"
        , "token"
        , "token_alias"
        , "target_id"
        , "project_id"
        , "organization_id"
        , "scopes"
      )
      VALUES (
        ${args.name}
        , ${args.token}
        , ${args.tokenAlias}
        , ${args.target}
        , ${args.project}
        , ${args.organization}
        , ${psql.array(args.scopes, 'text')}
      )
      RETURNING ${tokenFields}
    `,
      )
      .then(TokenModel.parse);
  }

  async getTokens(args: { targetId: string }) {
    return await this.pool
      .any(
        psql`
      SELECT ${tokenFields}
      FROM "tokens"
      WHERE
        "target_id" = ${args.targetId}
        AND "deleted_at" IS NULL
      ORDER BY "created_at" DESC
    `,
      )
      .then(z.array(TokenModel).parse);
  }

  async deleteTokens(args: { targetId: string; tokens: readonly string[] }) {
    if (args.tokens.length === 0) {
      return [];
    }

    return await this.pool
      .anyFirst(
        psql`
      UPDATE "tokens"
      SET "deleted_at" = NOW()
      WHERE
        "target_id" = ${args.targetId}
        AND "token" = ANY(${psql.array(args.tokens, 'text')})
      RETURNING "token"
    `,
      )
      .then(z.array(z.string()).parse);
  }

  async getTokenBySecret(token: string) {
    return await TargetTokenStorage.getTokenBySecret({ pool: this.pool })(token);
  }

  static getTokenBySecret(deps: { pool: CommonQueryMethods }) {
    return async function getTokenBySecret(token: string) {
      return await TargetTokenStorage.findByHash(deps)(hashTargetToken(token));
    };
  }

  static findByHash(deps: { pool: CommonQueryMethods }) {
    return async function findByHash(hashedToken: string) {
      return await deps.pool
        .maybeOne(
          psql`
        SELECT ${tokenFields}
        FROM "tokens"
        WHERE
          "token" = ${hashedToken}
          AND "deleted_at" IS NULL
        LIMIT 1
      `,
        )
        .then(TokenModel.nullable().parse);
    };
  }

  static touchTokenByHash(deps: { pool: CommonQueryMethods }) {
    return async function touchTokenBySecret(token: string) {
      await deps.pool.query(psql`
        UPDATE "tokens"
        SET "last_used_at" = NOW()
        WHERE
          "token" = ${token}
          AND "deleted_at" IS NULL
      `);
    };
  }
}
