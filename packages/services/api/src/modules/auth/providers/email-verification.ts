import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from 'graphql-modules';
import { sql, TaggedTemplateLiteralInvocation, type DatabasePool } from 'slonik';
import zod from 'zod';
import { TaskScheduler } from '@hive/workflows/kit';
import { EmailVerificationTask } from '@hive/workflows/tasks/email-verification';
import { HiveError } from '../../../shared/errors';
import { InMemoryRateLimiter } from '../../shared/providers/in-memory-rate-limiter';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { WEB_APP_URL } from '../../shared/providers/tokens';

const EmailVerificationModelBase = zod.object({
  id: zod.string().uuid(),
  superTokensUserId: zod.string(),
  createdAt: zod.number().transform(value => new Date(value)),
});

const UnverifiedEmailVerificationModel = EmailVerificationModelBase.extend({
  token: zod.string(),
  expiresAt: zod.number().transform(v => new Date(v)),
  verifiedAt: zod.null(),
});

const VerifiedEmailVerificationModel = EmailVerificationModelBase.extend({
  token: zod.string().nullable(),
  expiresAt: zod.null(),
  verifiedAt: zod.number().transform(v => new Date(v)),
});

const EmailVerificationModel = zod.union([
  UnverifiedEmailVerificationModel,
  VerifiedEmailVerificationModel,
]);

const emailVerificationFields = (r: TaggedTemplateLiteralInvocation) => sql`
  ${r}"id"
  , ${r}"supertokens_user_id" AS "superTokensUserId"
  , ${r}"token" AS "token"
  , ${r}"created_at" AS "createdAt"
  , ${r}"expires_at" AS "expiresAt"
  , ${r}"verified_at" AS "verifiedAt"
`;

/**
 * Responsible for email verification.
 * Talks to Storage.
 */
@Injectable({
  global: true,
})
export class EmailVerification {
  constructor(
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

    const emailVerification = await this.pool
      .maybeOne(
        sql`
          SELECT ${emailVerificationFields(sql`"ev".`)}
          FROM "email_verifications" "ev"
          WHERE "ev"."supertokens_user_id" = ${input.superTokensUserId}
        `,
      )
      .then(v => EmailVerificationModel.nullable().parse(v));

    return {
      verified: emailVerification?.verifiedAt != null,
    };
  }

  async sendVerificationEmail(
    input: {
      superTokensUserId: string;
      resend?: boolean;
    },
    ipAddress: string,
  ): Promise<{ ok: true; expiresAt: Date } | { ok: false; message: string }> {
    await this.rateLimiter.check(
      'sendVerificationEmail',
      ipAddress,
      60_000,
      2,
      `Exceeded rate limit for sending verification emails.`,
    );

    const superTokensUser = await this.pool
      .maybeOne(
        sql`
          SELECT COALESCE("seu"."email", "stu"."email") "email"
          FROM "supertokens_all_auth_recipe_users" "saaru"
          LEFT JOIN "supertokens_emailpassword_users" "seu"
          ON "saaru"."user_id" = "seu"."user_id"
          LEFT JOIN "supertokens_thirdparty_users" "stu"
          ON "saaru"."user_id" = "stu"."user_id"
          WHERE "saaru"."user_id" = ${input.superTokensUserId}
        `,
      )
      .then(v => zod.object({ email: zod.string().email() }).nullable().parse(v));

    if (!superTokensUser) {
      throw new HiveError('User not found.');
    }

    const existingVerification = await this.pool
      .maybeOne(
        sql`
          SELECT ${emailVerificationFields(sql`"ev".`)}
          FROM "email_verifications" "ev"
          WHERE "ev"."supertokens_user_id" = ${input.superTokensUserId}
        `,
      )
      .then(v => EmailVerificationModel.nullable().parse(v));

    if (existingVerification?.verifiedAt) {
      return {
        ok: false,
        message: 'Your email address has already been verified.',
      };
    }

    const emailVerification =
      existingVerification ??
      (await this.pool
        .one(
          sql`
            INSERT INTO "email_verifications" AS "ev" (
              "supertokens_user_id"
              , "token"
              , "expires_at"
            )
            VALUES (
              ${input.superTokensUserId}
              , ${randomBytes(16).toString('hex')}
              , now() + INTERVAL '30 minutes'
            )
            RETURNING ${emailVerificationFields(sql`"ev".`)}
          `,
        )
        .then<zod.output<typeof UnverifiedEmailVerificationModel>>(v =>
          UnverifiedEmailVerificationModel.parse(v),
        ));

    if (!existingVerification || input.resend) {
      await this.taskScheduler.scheduleTask(EmailVerificationTask, {
        user: {
          email: superTokensUser.email,
        },
        emailVerifyLink: `${this.appBaseUrl}/auth/verify-email?superTokensUserId=${input.superTokensUserId}&token=${emailVerification.token}`,
      });
    }

    return {
      ok: true,
      expiresAt: new Date(emailVerification.expiresAt),
    };
  }

  async verifyEmail(input: {
    superTokensUserId: string;
    token: string;
  }): Promise<{ ok: true; verified: boolean } | { ok: false; message: string }> {
    const emailVerification = await this.pool
      .maybeOne(
        sql`
          SELECT ${emailVerificationFields(sql`"ev".`)}
          FROM "email_verifications" "ev"
          WHERE
            "supertokens_user_id" = ${input.superTokensUserId}
            AND "token" = ${input.token}
            AND "expires_at" IS NOT NULL
            AND "verified_at" IS NULL
        `,
      )
      .then(v => UnverifiedEmailVerificationModel.nullable().parse(v));

    if (!emailVerification) {
      return {
        ok: false,
        message: 'The email verification link is invalid.',
      };
    }

    if (emailVerification.expiresAt.getTime() <= Date.now()) {
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
