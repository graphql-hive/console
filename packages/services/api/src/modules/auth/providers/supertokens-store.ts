import { Inject } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import z from 'zod';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';

const SessionInfoModel = z.object({
  sessionHandle: z.string(),
  userId: z.string(),
  sessionData: z.string(),
  expiresAt: z.number(),
  createdAt: z.number(),
  refreshTokenHash2: z.string(),
});

const UserModel = z.object({
  userId: z.string(),
  recipeId: z.union([z.literal('emailpassword'), z.literal('thirdparty')]),
});

const EmailUserModel = z.object({
  userId: z.string(),
  email: z.string(),
  passwordHash: z.string(),
  timeJoined: z.number(),
});

const ThirdpartUserModel = z.object({
  thirdPartyId: z.string(),
  userId: z.string(),
  email: z.string(),
});

export type SessionInfo = z.TypeOf<typeof SessionInfoModel>;

export class SuperTokensStore {
  private logger: Logger;
  constructor(
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    logger: Logger,
  ) {
    this.logger = logger.child({ module: 'SuperTokensStore' });
  }

  async getSessionInfo(sessionHandle: string) {
    this.logger.debug('Lookup session. (sessionHandle=%s)', sessionHandle);

    const query = sql`
      SELECT
        "session_handle" AS "sessionHandle"
        , "user_id" AS "userId"
        , "session_data" AS "sessionData"
        , "expires_at" AS "expiresAt"
        , "created_at_time" AS "createdAt"
        , "refresh_token_hash_2" AS "refreshTokenHash2"
      FROM
        "supertokens_session_info"
      WHERE
        "session_handle" = ${sessionHandle}
    `;

    const result = await this.pool.maybeOne(query);
    const record = SessionInfoModel.nullable().parse(result);
    if (!record) {
      this.logger.debug('Session not found (sessionHandle=%s)', sessionHandle);
      return null;
    }

    this.logger.debug('Session found (sessionHandle=%s)', sessionHandle);
    return record;
  }

  async deleteSession(sessionHandle: string) {
    this.logger.debug('Delete session. (sessionHandle=%s)', sessionHandle);

    const query = sql`
      DELETE
      FROM "supertokens_session_info"
      WHERE
        "session_handle" = ${sessionHandle}
    `;

    await this.pool.query(query);
  }

  async findEmailPasswordUserByEmail(email: string) {
    const query = sql`
      SELECT
        "user_id" AS "userId"
        , "email" AS "email"
        , "password_hash" AS "passwordHash"
        , "time_joined" AS "timeJoined"
      FROM
       "supertokens_emailpassword_users"
      WHERE "email" = ${email}
    `;

    const record = await this.pool.maybeOne(query).then(EmailUserModel.nullable().parse);
    return record;
  }

  private async lookupEmailUserByUserId(userId: string) {
    const query = sql`
      SELECT
        "user_id" AS "userId"
        , "email" AS "email"
        , "password_hash" AS "passwordHash"
        , "time_joined" AS "timeJoined"
      FROM
       "supertokens_emailpassword_users"
      WHERE "user_id" = ${userId}
    `;

    const record = await this.pool.maybeOne(query).then(EmailUserModel.nullable().parse);
    return record;
  }

  public async lookupEmailUserByEmail(email: string) {
    const query = sql`
      SELECT
        "user_id" AS "userId"
        , "email" AS "email"
        , "password_hash" AS "passwordHash"
        , "time_joined" AS "timeJoined"
      FROM
       "supertokens_emailpassword_users"
      WHERE "email" = lower(${email})
    `;

    const record = await this.pool.maybeOne(query).then(EmailUserModel.nullable().parse);
    return record;
  }

  private async lookupThirdPartyUserByUserId(userId: string) {
    const query = sql`
      SELECT
        "user_id" AS "userId"
        , "email" AS "email"
        , "third_party_user_id" AS "thirdPartyId"
      FROM
       "supertokens_thirdparty_users"
      WHERE "user_id" = ${userId}
    `;

    const record = await this.pool.maybeOne(query).then(ThirdpartUserModel.nullable().parse);
    return record;
  }

  async lookupUserByUserId(userId: string) {
    this.logger.debug('Lookup user. (userId=%s)', userId);

    const query = sql`
      SELECT
        "user_id" AS "userId"
        , "recipe_id" AS "recipeId"
      FROM
        "supertokens_all_auth_recipe_users"
      WHERE
        "user_id" = ${userId}
    `;

    const record = await this.pool.maybeOne(query).then(UserModel.nullable().parse);

    if (!record) {
      return null;
    }

    if (record.recipeId === 'emailpassword') {
      return this.lookupEmailUserByUserId(record.userId);
    }

    if (record.recipeId === 'thirdparty') {
      return this.lookupThirdPartyUserByUserId(record.userId);
    }

    return null;
  }

  async createSession(
    sessionHandle: string,
    userId: string,
    sessionDataInDatabase: string,
    accessTokenPayload: string,
    refreshTokenHash2: string,
    expiresAt: number,
  ) {
    const query = sql`
      INSERT INTO "supertokens_session_info" (
        "app_id"
        , "tenant_id"
        , "session_handle"
        , "user_id"
        , "refresh_token_hash_2"
        , "session_data"
        , "expires_at"
        , "jwt_user_payload"
        , "use_static_key"
        , "created_at_time"
      ) VALUES (
        'public'
        , 'public'
        , ${sessionHandle}
        , ${userId}
        , ${refreshTokenHash2}
        , ${sessionDataInDatabase}
        , ${expiresAt}
        , ${accessTokenPayload}
        , false
        , ${Date.now()}
      )
      RETURNING
        "session_handle" AS "sessionHandle"
        , "user_id" AS "userId"
        , "session_data" AS "sessionData"
        , "expires_at" AS "expiresAt"
        , "created_at_time" AS "createdAt"
        , "refresh_token_hash_2" AS "refreshTokenHash2"
    `;

    return await this.pool.one(query).then(SessionInfoModel.parse);
  }

  async updateSessionRefreshHash(
    sessionHandle: string,
    lastRefreshTokenHash2: string,
    newRefreshTokenHash2: string,
  ) {
    const query = sql`
      UPDATE
        "supertokens_session_info"
      SET
        "refresh_token_hash_2" = ${newRefreshTokenHash2}
      WHERE
        "session_handle" = ${sessionHandle}
        AND "refresh_token_hash_2" = ${lastRefreshTokenHash2}
      RETURNING
        "session_handle" AS "sessionHandle"
        , "user_id" AS "userId"
        , "session_data" AS "sessionData"
        , "expires_at" AS "expiresAt"
        , "created_at_time" AS "createdAt"
        , "refresh_token_hash_2" AS "refreshTokenHash2"
    `;

    return await this.pool.maybeOne(query).then(SessionInfoModel.nullable().parse);
  }

  async createEmailPasswordUser(args: { email: string; passwordHash: string }) {
    const userId = crypto.randomUUID();
    const now = Date.now();
    const allRecipeUsersQuery = sql`
      INSERT INTO "supertokens_all_auth_recipe_users" (
        "app_id"
        , "tenant_id"
        , "user_id"
        , "primary_or_recipe_user_id"
        , "is_linked_or_is_a_primary_user"
        , "recipe_id"
        , "time_joined"
        , "primary_or_recipe_user_time_joined"
      ) VALUES (
        'public'
        , 'public'
        , ${userId}
        , ${userId}
        , false
        , 'emailpassword'
        , ${now}
        , ${now}
      )
    `;

    const emailPasswordUserQuery = sql`
      INSERT INTO "supertokens_emailpassword_users" (
        "app_id"
        , "user_id"
        , "email"
        , "password_hash"
        , "time_joined"
      ) VALUES (
        'public'
        , ${userId}
        , ${args.email}
        , ${args.passwordHash}
        , ${now}
      )
      RETURNING
        "user_id" AS "userId"
        , "email" AS "email"
        , "password_hash" AS "passwordHash"
        , "time_joined" AS "timeJoined"
    `;

    const appIdToUserIdQuery = sql`
      INSERT INTO "supertokens_app_id_to_user_id" (
        "app_id"
        , "user_id"
        , "recipe_id"
        , "primary_or_recipe_user_id"
        , "is_linked_or_is_a_primary_user"
      ) VALUES (
        'public'
        , ${userId}
        , 'emailpassword'
        , ${userId}
        , false
      )
    `;

    return await this.pool
      .transaction(async t => {
        await t.query(appIdToUserIdQuery);
        const result = await t.one(emailPasswordUserQuery);
        await t.query(allRecipeUsersQuery);
        return result;
      })
      .then(r => EmailUserModel.parse(r));
  }
}
