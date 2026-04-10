import { z } from 'zod';
import { createPostgresDatabasePool, psql, toDate, type Interceptor } from '@hive/postgres';

const TokenModel = z.object({
  token: z.string(),
  tokenAlias: z.string(),
  name: z.string(),
  date: z.string(),
  lastUsedAt: z.string().nullable(),
  organization: z.string(),
  project: z.string(),
  target: z.string(),
  scopes: z
    .array(z.string())
    .nullable()
    .transform(value => value ?? []),
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
  , "scopes"
`;

export async function createTokenStorage(
  connection: string,
  maximumPoolSize: number,
  additionalInterceptors: Interceptor[] = [],
) {
  const pool = await createPostgresDatabasePool({
    connectionParameters: connection,
    maximumPoolSize,
    additionalInterceptors,
  });

  return {
    destroy() {
      return pool.end();
    },
    async isReady() {
      try {
        await pool.exists(psql`SELECT 1`);
        return true;
      } catch {
        return false;
      }
    },
    async getTokens({ target }: { target: string }) {
      return await pool
        .any(
          psql`
          SELECT ${tokenFields}
          FROM tokens
          WHERE
            target_id = ${target}
            AND deleted_at IS NULL
          ORDER BY created_at DESC
        `,
        )
        .then(z.array(TokenModel).parse);
    },
    async getToken({ token }: { token: string }) {
      return await pool
        .maybeOne(
          psql`
          SELECT ${tokenFields}
          FROM tokens
          WHERE token = ${token} AND deleted_at IS NULL
          LIMIT 1
        `,
        )
        .then(TokenModel.nullable().parse);
    },
    async createToken({
      token,
      tokenAlias,
      target,
      project,
      organization,
      name,
      scopes,
    }: {
      token: string;
      tokenAlias: string;
      name: string;
      target: string;
      project: string;
      organization: string;
      scopes: readonly string[];
    }) {
      return await pool
        .one(
          psql`
          INSERT INTO tokens
            (name, token, token_alias, target_id, project_id, organization_id, scopes)
          VALUES
            (${name}, ${token}, ${tokenAlias}, ${target}, ${project}, ${organization}, ${psql.array(
              scopes,
              'text',
            )})
          RETURNING ${tokenFields}
        `,
        )
        .then(TokenModel.parse);
    },
    async deleteToken(params: {
      targetId: string;
      token: string;
      postDeletionTransaction: () => Promise<void>;
    }) {
      return await pool.transaction('deleteToken', async t => {
        const deleted = await t.maybeOneFirst(psql`
          UPDATE
            "tokens"
          SET
            "deleted_at" = NOW()
          WHERE
            "target_id" = ${params.targetId}
            AND "token" = ${params.token}
          RETURNING true
        `);

        if (deleted) {
          await params.postDeletionTransaction();
        }

        return !!deleted;
      });
    },
    async touchTokens({ tokens }: { tokens: Array<{ token: string; date: Date }> }) {
      await pool.query(psql`
        UPDATE tokens as t
        SET last_used_at = c.last_used_at
        FROM (
            VALUES
              (${psql.join(
                tokens.map(t => psql`${t.token}, ${toDate(t.date)}`),
                psql.fragment`), (`,
              )})
        ) as c(token, last_used_at)
        WHERE c.token = t.token;
      `);
    },
  };
}
