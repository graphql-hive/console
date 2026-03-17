import { Interceptor, sql } from 'slonik';
import { getPool, toDate, tokens } from './db';
import type { Slonik } from './shared';

function transformToken(row: tokens) {
  return {
    token: row.token,
    tokenAlias: row.token_alias,
    name: row.name,
    date: row.created_at as unknown as string,
    lastUsedAt: row.last_used_at as unknown as string | null,
    organization: row.organization_id,
    project: row.project_id,
    target: row.target_id,
    scopes: row.scopes || [],
  };
}

export async function createTokenStorage(
  connection: string,
  maximumPoolSize: number,
  additionalInterceptors: Interceptor[] = [],
) {
  const pool = await getPool(connection, maximumPoolSize, additionalInterceptors);

  return {
    destroy() {
      return pool.end();
    },
    async isReady() {
      try {
        await pool.exists(sql`SELECT 1`);
        return true;
      } catch {
        return false;
      }
    },
    async getTokens({ target }: { target: string }) {
      const result = await pool.query<Slonik<tokens>>(
        sql`
          SELECT *
          FROM tokens
          WHERE
            target_id = ${target}
            AND deleted_at IS NULL
          ORDER BY created_at DESC
        `,
      );

      return result.rows.map(transformToken);
    },
    async getToken({ token }: { token: string }) {
      const row = await pool.maybeOne<Slonik<tokens>>(
        sql`
          SELECT *
          FROM tokens
          WHERE token = ${token} AND deleted_at IS NULL
          LIMIT 1
        `,
      );

      return row ? transformToken(row) : null;
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
      const row = await pool.one<Slonik<tokens>>(
        sql`
          INSERT INTO tokens
            (name, token, token_alias, target_id, project_id, organization_id, scopes)
          VALUES
            (${name}, ${token}, ${tokenAlias}, ${target}, ${project}, ${organization}, ${sql.array(
              scopes,
              'text',
            )})
          RETURNING *
        `,
      );

      return transformToken(row);
    },
    async deleteToken(params: { token: string; postDeletionTransaction: () => Promise<void> }) {
      await pool.transaction(async t => {
        await t.query(sql`
          UPDATE tokens
          SET deleted_at = NOW()
          WHERE token = ${params.token}
        `);

        await params.postDeletionTransaction();
      });
    },
    async touchTokens({ tokens }: { tokens: Array<{ token: string; date: Date }> }) {
      await pool.query(sql`
        UPDATE tokens as t
        SET last_used_at = c.last_used_at
        FROM (
            VALUES
              (${sql.join(
                tokens.map(t => sql`${t.token}, ${toDate(t.date)}`),
                sql`), (`,
              )})
        ) as c(token, last_used_at)
        WHERE c.token = t.token;
      `);
    },
  };
}
