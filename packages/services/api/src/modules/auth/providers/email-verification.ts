import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
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
  userIdentityId: zod.string(),
  createdAt: zod.number().transform(value => new Date(value)),
});

const UnverifiedEmailVerificationModel = EmailVerificationModelBase.extend({
  tokenHash: zod.string(),
  expiresAt: zod.number().transform(v => new Date(v)),
  verifiedAt: zod.null(),
});

const VerifiedEmailVerificationModel = EmailVerificationModelBase.extend({
  tokenHash: zod.string().nullable(),
  expiresAt: zod.null(),
  verifiedAt: zod.number().transform(v => new Date(v)),
});

const EmailVerificationModel = zod.union([
  UnverifiedEmailVerificationModel,
  VerifiedEmailVerificationModel,
]);

const emailVerificationFields = (r: TaggedTemplateLiteralInvocation) => sql`
  ${r}"id"
  , ${r}"user_identity_id" AS "userIdentityId"
  , ${r}"token_hash" AS "tokenHash"
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

  async checkUserEmailVerified(input: { userIdentityId: string }) {
    const { provider } = await this.pool
      .one(
        sql`
          SELECT COALESCE("stu"."third_party_id", 'emailpassword') "provider"
          FROM "supertokens_all_auth_recipe_users" "saaru"
          LEFT JOIN "supertokens_thirdparty_users" "stu"
          ON "saaru"."user_id" = "stu"."user_id"
          WHERE "saaru"."user_id" = ${input.userIdentityId}
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
          WHERE "ev"."user_identity_id" = ${input.userIdentityId}
        `,
      )
      .then(v => EmailVerificationModel.nullable().parse(v));

    return {
      verified: emailVerification?.verifiedAt != null,
    };
  }

  async sendVerificationEmail(
    input: {
      userIdentityId: string;
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
          WHERE "saaru"."user_id" = ${input.userIdentityId}
        `,
      )
      .then(v => zod.object({ email: zod.string().email() }).nullable().parse(v));

    if (!superTokensUser) {
      throw new HiveError('User identity not found.');
    }

    const existingVerification = await this.pool
      .maybeOne(
        sql`
          SELECT ${emailVerificationFields(sql`"ev".`)}
          FROM "email_verifications" "ev"
          WHERE "ev"."user_identity_id" = ${input.userIdentityId}
        `,
      )
      .then(v => EmailVerificationModel.nullable().parse(v));

    if (existingVerification?.verifiedAt) {
      return {
        ok: false,
        message: 'Your email address has already been verified.',
      };
    }

    const token = randomBytes(16).toString('hex');
    const tokenHash = await bcrypt.hash(token, await bcrypt.genSalt());
    const emailVerification =
      !existingVerification || input.resend
        ? await this.pool
            .one(
              sql`
                INSERT INTO "email_verifications" AS "ev" (
                  "user_identity_id"
                  , "token_hash"
                  , "expires_at"
                )
                VALUES (
                  ${input.userIdentityId}
                  , ${tokenHash}
                  , now() + INTERVAL '30 minutes'
                )
                ON CONFLICT ("user_identity_id") DO UPDATE SET
                  "token_hash" = EXCLUDED.token_hash
                  , "expires_at" = EXCLUDED.expires_at
                  , "verified_at" = NULL
                RETURNING ${emailVerificationFields(sql`"ev".`)}
              `,
            )
            .then<zod.output<typeof UnverifiedEmailVerificationModel>>(v =>
              UnverifiedEmailVerificationModel.parse(v),
            )
        : existingVerification;

    if (existingVerification !== emailVerification) {
      await this.taskScheduler.scheduleTask(EmailVerificationTask, {
        user: {
          email: superTokensUser.email,
        },
        emailVerifyLink: `${this.appBaseUrl}/auth/verify-email?userIdentityId=${emailVerification.userIdentityId}&token=${token}`,
      });
    }

    return {
      ok: true,
      expiresAt: new Date(emailVerification.expiresAt),
    };
  }

  async verifyEmail(input: {
    userIdentityId: string;
    token: string;
  }): Promise<{ ok: true; verified: boolean } | { ok: false; message: string }> {
    const emailVerification = await this.pool
      .maybeOne(
        sql`
          SELECT ${emailVerificationFields(sql`"ev".`)}
          FROM "email_verifications" "ev"
          WHERE
            "user_identity_id" = ${input.userIdentityId}
            AND "expires_at" IS NOT NULL
            AND "verified_at" IS NULL
        `,
      )
      .then(v => UnverifiedEmailVerificationModel.nullable().parse(v));

    const isTokenValid = emailVerification
      ? await bcrypt.compare(input.token, emailVerification.tokenHash)
      : false;

    if (!emailVerification || !isTokenValid) {
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
