import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import zod from 'zod';
import { TaskScheduler } from '@hive/workflows/kit';
import { EmailVerificationTask } from '@hive/workflows/tasks/email-verification';
import { HiveError } from '../../../shared/errors';
import { InMemoryRateLimiter } from '../../shared/providers/in-memory-rate-limiter';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { Storage } from '../../shared/providers/storage';
import { WEB_APP_URL } from '../../shared/providers/tokens';

/**
 * Responsible for email verification.
 * Talks to Storage.
 */
@Injectable({
  global: true,
})
export class EmailVerification {
  constructor(
    private storage: Storage,
    private taskScheduler: TaskScheduler,
    private rateLimiter: InMemoryRateLimiter,
    @Inject(WEB_APP_URL) private appBaseUrl: string,
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
  ) {}

  async checkUserEmailVerified(input: { superTokensUserId: string }) {
    const { provider } = await this.pool
      .one(
        sql`
          SELECT COALESCE("stu"."third_party_id", 'emailpassword') "provider"
          FROM "supertokens_all_auth_recipe_users" "saaru"
          LEFT JOIN "supertokens_thirdparty_users" "stu"
          ON "saaru"."user_id" = "stu"."user_id"
          WHERE "saaru"."user_id" = ${input.superTokensUserId}
        `,
      )
      .then(v =>
        zod.object({ provider: zod.enum(['emailpassword', 'google', 'github', 'oidc']) }).parse(v),
      );

    if (provider === 'google' || provider === 'github') {
      return { verified: true };
    }
    
    const user = await this.storage.getUserBySuperTokenId({
      superTokensUserId: input.superTokensUserId,
    });
    if (!user) {
      throw new Error('User not found.');
    }

    const emailVerification = await this.pool.maybeOne<{
      verifiedAt: number | null;
    }>(sql`
      SELECT "verified_at" "verifiedAt"
      FROM "email_verifications"
      WHERE
        "user_id" = ${user.id}
        AND "provider" = ${user.provider}
        AND "email" = ${user.email}
    `);

    return {
      verified: emailVerification?.verifiedAt != null,
    };
  }

  async sendVerificationEmail(
    input: {
      superTokensUserId: string;
      email: string;
    },
    actorId?: string,
  ): Promise<{ ok: true; expiresAt: Date } | { ok: false; message: string }> {
    if (actorId) {
      await this.rateLimiter.check(
        'sendVerificationEmail',
        actorId,
        60_000,
        2,
        `Exceeded rate limit for sending verification emails.`,
      );
    }

    const parsedEmail = zod.string().email().safeParse(input.email);
    if (!parsedEmail.success) {
      return {
        ok: false,
        message: parsedEmail.error.errors[0].message,
      };
    }

    const user = await this.storage.getUserBySuperTokenId({
      superTokensUserId: input.superTokensUserId,
    });

    if (!user) {
      return {
        ok: false,
        message: 'User not found.',
      };
    }

    let emailVerification = await this.pool.maybeOne<{
      token: string | null;
      expiresAt: number | null;
      verifiedAt?: number | null;
    }>(sql`
      SELECT
        "token"
        , "expires_at" "expiresAt"
        , "verified_at" "verifiedAt"
      FROM "email_verifications"
      WHERE
        "user_id" = ${user.id}
        AND "provider" = ${user.provider}
        AND "email" = ${user.email}
    `);

    if (emailVerification?.verifiedAt) {
      return {
        ok: false,
        message: 'Your email address has already been verified.',
      };
    }

    if (emailVerification && emailVerification.token == null) {
      throw new HiveError('Database is in invalid state');
    }

    if (!emailVerification) {
      emailVerification = await this.pool.one<{
        token: string;
        expiresAt: number;
      }>(sql`
        INSERT INTO "email_verifications" (
          "user_id"
          , "provider"
          , "email"
          , "token"
          , "expires_at"
        )
        VALUES (
          ${user.id}
          , ${user.provider}
          , ${user.email}
          , ${randomBytes(16).toString('hex')}
          , now() + INTERVAL '30 minutes'
        )
        RETURNING
          "token"
          , "expires_at" "expiresAt"
      `);
    }

    await this.taskScheduler.scheduleTask(EmailVerificationTask, {
      user: { id: user.id, email: parsedEmail.data },
      emailVerifyLink: `${this.appBaseUrl}/auth/verify-email?superTokensUserId=${input.superTokensUserId}&token=${emailVerification.token}`,
    });

    return {
      ok: true,
      expiresAt: new Date(emailVerification.expiresAt!),
    };
  }

  async verifyEmail(input: {
    superTokensUserId: string;
    token: string;
  }): Promise<{ ok: true; verified: boolean } | { ok: false; message: string }> {
    const user = await this.storage.getUserBySuperTokenId({
      superTokensUserId: input.superTokensUserId,
    });

    if (!user) {
      return {
        ok: false,
        message: 'User not found.',
      };
    }

    const emailVerification = await this.pool.maybeOne<{
      id: string;
      expiresAt: number;
    }>(sql`
      SELECT "id", "expires_at" "expiresAt"
      FROM "email_verifications"
      WHERE
        "user_id" = ${user.id}
        AND "provider" = ${user.provider}
        AND "email" = ${user.email}
        AND "token" = ${input.token}
        AND "expires_at" IS NOT NULL
        AND "verified_at" IS NULL
    `);

    if (!emailVerification) {
      return {
        ok: false,
        message: 'The email verification link is invalid.',
      };
    }

    if (emailVerification.expiresAt <= Date.now()) {
      await this.pool.query(sql`
        DELETE FROM "email_verifications"
        WHERE "id" = ${emailVerification.id}
      `);

      return {
        ok: false,
        message: 'The email verification link has expired.',
      };
    }

    await this.pool.query(sql`
      UPDATE "email_verifications"
      SET
        "verified_at" = now()
        , "expires_at" = NULL
      WHERE "id" = ${emailVerification.id}
    `);

    return {
      ok: true,
      verified: true,
    };
  }
}
