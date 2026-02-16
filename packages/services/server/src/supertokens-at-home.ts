import * as c from 'node:crypto';
import bcrypt from 'bcryptjs';
import { type FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import z from 'zod';
import cookie from '@fastify/cookie';
import { Storage, User } from '@hive/api';
import { SuperTokensStore } from '@hive/api/modules/auth/providers/supertokens-store';

export function registerSupertokensAtHome(server: FastifyInstance, storage: Storage) {
  const supertokensStore = new SuperTokensStore(storage.pool, server.log);

  server.register(cookie, {
    hook: 'onRequest',
    parseOptions: {},
  });

  server.route({
    url: '/auth-api/signout',
    method: 'POST',
    handler(_req, rep) {
      rep
        .setCookie('sRefreshToken', '', {
          httpOnly: true,
          secure: true,
          path: '/auth-api/session/refresh',
          sameSite: 'lax',
          expires: new Date(0),
        })
        .setCookie('sAccessToken', '', {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'lax',
          expires: new Date(0),
        })
        .header('front-token', 'remove')
        .header('Access-Control-Expose-Headers', 'front-token')
        .send({
          status: 'OK',
        });
    },
  });

  server.route({
    url: '/auth-api/signup',
    method: 'POST',
    async handler(req, rep) {
      const parsedBody = SignUpBodyModel.safeParse(req.body);

      if (!parsedBody.success) {
        return rep.send(401);
      }

      const firstName =
        parsedBody.data.formFields.find(field => field.id === 'firstName')?.value ?? null;
      const lastName =
        parsedBody.data.formFields.find(field => field.id === 'lastName')?.value ?? null;
      const email = parsedBody.data.formFields.find(field => field.id === 'email')?.value ?? '';
      const password =
        parsedBody.data.formFields.find(field => field.id === 'password')?.value ?? '';

      const emailRegex = /^((?!\.)[\w-_.]*[^.])(@\w+)(\.\w+(\.\w+)?[^.\W])$/gim;

      // Verify email
      if (!emailRegex.test(email)) {
        return {
          status: 'GENERAL_ERROR',
          message: 'Invalid email provided.',
        };
      }

      // Lookup user
      let user = await supertokensStore.lookupEmailUserByEmail(email);

      if (user) {
        return {
          status: 'EMAIL_ALREADY_EXISTS_ERROR',
        };
      }

      // TODO: Validate password

      // hash password
      const passwordHash = await hashPassword(password);

      // create user
      user = await supertokensStore.createEmailPasswordUser({
        email,
        passwordHash,
      });

      const ensureUserResult = await storage.ensureUserExists({
        superTokensUserId: user.userId,
        email,
        oidcIntegration: null,
        firstName,
        lastName,
      });

      if (ensureUserResult.ok === false) {
        return rep.send({
          status: 'SIGN_UP_NOT_ALLOWED',
          reason: 'Not allowed.',
        });
      }

      const { session, accessToken, refreshToken } = await createNewSession(supertokensStore, {
        hiveUser: ensureUserResult.user,
        oidcIntegrationId: null,
        superTokensUserId: user.userId,
      });
      const frontToken = createFrontToken({
        superTokensUserId: user.userId,
        accessToken,
      });

      return rep
        .setCookie('sRefreshToken', refreshToken, {
          httpOnly: true,
          secure: true,
          path: '/auth-api/session/refresh',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .setCookie('sAccessToken', accessToken.token, {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .header('front-token', frontToken)
        .header('access-control-expose-headers', 'front-token')
        .send({
          status: 'OK',
          user: {
            id: user.userId,
            isPrimaryUser: false,
            tenantIds: ['public'],
            timeJoined: user.timeJoined,
            emails: [user.email],
            phoneNumbers: [],
            thirdParty: [],
            loginMethods: [
              {
                tenantIds: ['public'],
                recipeUserId: user.userId,
                verified: false,
                timeJoined: user.timeJoined,
                recipeId: 'emailpassword',
                email: user.email,
              },
            ],
          },
        });
    },
  });

  server.route({
    url: '/auth-api/signin',
    method: 'POST',
    async handler(req, rep) {
      const parsedBody = SignInBodyModel.safeParse(req.body);

      if (!parsedBody.success) {
        return rep.send(401);
      }

      const email = parsedBody.data.formFields.find(field => field.id === 'email')?.value ?? '';
      const password =
        parsedBody.data.formFields.find(field => field.id === 'password')?.value ?? '';

      const user = await supertokensStore.findEmailPasswordUserByEmail(email);

      if (!user) {
        return rep.send({
          status: 'WRONG_CREDENTIALS_ERROR',
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);

      if (!passwordMatch) {
        return rep.send({
          status: 'WRONG_CREDENTIALS_ERROR',
        });
      }

      const result = await storage.ensureUserExists({
        superTokensUserId: user.userId,
        email: user.email,
        oidcIntegration: null,
        // They are not available during sign in.
        firstName: null,
        lastName: null,
      });

      if (!result.ok) {
        return rep.send({
          status: 'SIGN_IN_NOT_ALLOWED',
          reason: result.reason,
        });
      }

      const { session, refreshToken, accessToken } = await createNewSession(supertokensStore, {
        hiveUser: result.user,
        oidcIntegrationId: null,
        superTokensUserId: user.userId,
      });
      const frontToken = createFrontToken({
        superTokensUserId: user.userId,
        accessToken,
      });

      return rep
        .setCookie('sRefreshToken', refreshToken, {
          httpOnly: true,
          secure: true,
          path: '/auth-api/session/refresh',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .setCookie('sAccessToken', accessToken.token, {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .header('front-token', frontToken)
        .header('access-control-expose-headers', 'front-token')
        .send({
          status: 'OK',
          user: {
            id: user.userId,
            isPrimaryUser: false,
            tenantIds: ['public'],
            timeJoined: user.timeJoined,
            emails: [user.email],
            phoneNumbers: [],
            thirdParty: [],
            loginMethods: [
              {
                tenantIds: ['public'],
                recipeUserId: user.userId,
                verified: false,
                timeJoined: user.timeJoined,
                recipeId: 'emailpassword',
                email: user.email,
              },
            ],
          },
        });
    },
  });

  server.route({
    url: '/auth-api/session/refresh',
    method: 'POST',
    async handler(req, rep) {
      const refreshToken = req.cookies['sRefreshToken'] ?? null;

      if (!refreshToken) {
        return rep.status(404).send();
      }

      const [payload, nonce, version] = refreshToken.split('.');

      if (version !== 'V2') {
        return rep.status(404).send();
      }

      // TODO: error handling here
      const rawPayload = JSON.parse(decryptRefreshToken(payload).toString('utf8'));

      const result = RefreshTokenModel.parse(rawPayload);

      if (result.nonce !== nonce) {
        throw new Error('Invalid session!');
      }

      // 1. lookup refresh token based on hash and check if it is invalid or rejected
      const session = await supertokensStore.getSessionInfo(result.sessionHandle);

      if (!session) {
        throw new Error('Session does not exist.');
      }

      if (
        result.parentRefreshTokenHash1 &&
        session.refreshTokenHash2 !== sha256(result.parentRefreshTokenHash1)
      ) {
        throw new Error('Refresh hash does not match');
      }

      if (session.expiresAt < Date.now()) {
        throw new Error('Session is expired');
      }

      // 2. create a new refresh token
      const parentTokenHash = sha256(refreshToken);

      const newRefreshToken = createRefreshToken({
        sessionHandle: session.sessionHandle,
        userId: session.userId,
        parentRefreshTokenHash1: sha256(refreshToken),
      });

      // 2,5. store new parentTokenHash in DB
      await supertokensStore.updateSessionRefreshHash(
        session.sessionHandle,
        sha256(parentTokenHash),
      );

      // 3. create a new access token
      const accessToken = createAccessToken(
        session.userId,
        session.sessionHandle,
        session.sessionData,
        sha256(newRefreshToken),
        parentTokenHash,
      );

      const frontToken = createFrontToken({
        superTokensUserId: session.userId,
        accessToken,
      });

      return rep
        .setCookie('sRefreshToken', newRefreshToken, {
          httpOnly: true,
          secure: true,
          path: '/auth-api/session/refresh',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .setCookie('sAccessToken', accessToken.token, {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'lax',
          expires: new Date(session.expiresAt),
        })
        .header('front-token', frontToken)
        .header('access-control-expose-headers', 'front-token')
        .send();
    },
  });
}

const SignUpBodyModel = z.object({
  formFields: z.array(
    z.object({
      id: z.string(),
      value: z.string(),
    }),
  ),
});

const SignInBodyModel = SignUpBodyModel.extend({});

async function hashPassword(plaintextPassword: string): Promise<string> {
  // The "cost factor" or salt rounds. 10 is a good, standard balance of security and performance.
  // This value is included in the final hash string itself.
  const saltRounds = 10;

  // bcrypt.hash handles the generation of a random salt and the hashing process.
  // The operation is asynchronous to prevent blocking the event loop.
  const hash = await bcrypt.hash(plaintextPassword, saltRounds);

  return hash;
}

async function createNewSession(
  supertokensStore: SuperTokensStore,
  args: {
    superTokensUserId: string;
    hiveUser: User;
    oidcIntegrationId: string | null;
  },
) {
  const sessionHandle = crypto.randomUUID();
  // 1 week for now
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1_000;

  const refreshToken = createRefreshToken({
    sessionHandle,
    userId: args.superTokensUserId,
    parentRefreshTokenHash1: null,
  });

  const payload: SuperTokensSessionPayload = {
    version: '2',
    superTokensUserId: args.superTokensUserId,
    userId: args.hiveUser.id,
    oidcIntegrationId: args.oidcIntegrationId ?? null,
    email: args.hiveUser.email,
  };

  const stringifiedPayload = JSON.stringify(payload);

  const session = await supertokensStore.createSession(
    sessionHandle,
    args.superTokensUserId,
    stringifiedPayload,
    stringifiedPayload,
    sha256(refreshToken),
    expiresAt,
  );

  const accessToken = createAccessToken(
    args.superTokensUserId,
    sessionHandle,
    stringifiedPayload,
    sha256(refreshToken),
    null,
  );

  return {
    session,
    refreshToken,
    accessToken,
  };
}

// TODO: not hardcode this localhost value here :)
const UNSAFE_REFRESH_TOKEN_MASTER_KEY =
  '1000:15e5968d52a9a48921c1c63d88145441a8099b4a44248809a5e1e733411b3eeb80d87a6e10d3390468c222f6a91fef3427f8afc8b91ea1820ab10c7dfd54a268:39f72164821e08edd6ace99f3bd4e387f45fa4221fe3cd80ecfee614850bc5d647ac2fddc14462a00647fff78c22e8d01bc306a91294f5b889a90ba891bf0aa0';

function decryptRefreshToken(
  encodedData: string,
  masterKey: string = UNSAFE_REFRESH_TOKEN_MASTER_KEY,
) {
  // 1. Decode the incoming string (URL -> Base64 -> Buffer).
  const urlDecodedData = decodeURIComponent(encodedData);
  const buffer = Buffer.from(urlDecodedData, 'base64');

  // 2. Deconstruct the buffer based on the Java encryption logic.
  // The first 12 bytes are the IV.
  const iv = buffer.slice(0, 12);

  // The rest of the buffer is the encrypted data + 16-byte auth tag.
  const encryptedPayload = buffer.slice(12);

  // 3. Re-derive the secret key using PBKDF2. This is the critical step.
  // The parameters MUST match the Java side exactly.
  // The IV is used as the salt.
  const iterations = 100;
  const keylen = 32; // 32 bytes = 256 bits
  const digest = 'sha512'; // NOTE: This is a guess. See explanation below.

  const secretKey = c.pbkdf2Sync(masterKey, iv, iterations, keylen, digest);

  // 4. Separate the encrypted data from the authentication tag.
  const authTagLength = 16; // 128 bits
  const encryptedData = encryptedPayload.slice(0, -authTagLength);
  const authTag = encryptedPayload.slice(-authTagLength);

  // 5. Perform the decryption with the derived key and IV.
  const decipher = c.createDecipheriv('aes-256-gcm', secretKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData);
  decrypted += decipher.final('utf8');

  return decrypted;
}

function encryptRefreshToken(
  plaintext: string,
  masterKey: string = UNSAFE_REFRESH_TOKEN_MASTER_KEY,
) {
  // 1. Generate a random 12-byte IV (Initialization Vector), same as the Java side.
  const iv = c.randomBytes(12);

  // 2. Derive the secret key using PBKDF2. The IV is used as the salt.
  // The parameters (iterations, key length, and digest) match the Java implementation.
  const iterations = 100;
  const keylen = 32; // 32 bytes = 256 bits
  const digest = 'sha512'; // From "PBKDF2WithHmacSHA512"

  const secretKey = c.pbkdf2Sync(masterKey, iv, iterations, keylen, digest);

  // 3. Create the AES-256-GCM cipher.
  const cipher = c.createCipheriv('aes-256-gcm', secretKey, iv);

  // 4. Encrypt the plaintext.
  // The result is the ciphertext.
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // 5. Get the 16-byte authentication tag.
  // This is a crucial step in GCM.
  const authTag = cipher.getAuthTag();

  // 6. Concatenate everything in the correct order: IV + Ciphertext + Auth Tag.
  // This matches the Java `ByteBuffer` logic.
  const finalBuffer = Buffer.concat([iv, encrypted, authTag]);

  // 7. Base64-encode the final buffer and then URL-encode it for safe transport.
  const base64Data = finalBuffer.toString('base64');
  return encodeURIComponent(base64Data);
}

function createRefreshToken(args: {
  sessionHandle: string;
  userId: string;
  parentRefreshTokenHash1: string | null;
}) {
  const newNonce = sha256(crypto.randomUUID());

  const encryptedPayload = encryptRefreshToken(
    JSON.stringify({
      sessionHandle: args.sessionHandle,
      userId: args.userId,
      nonce: newNonce,
      parentRefreshTokenHash1: args.parentRefreshTokenHash1 ?? undefined,
    }),
  );

  const refreshToken = encryptedPayload + '.' + newNonce + '.' + 'V2';

  return refreshToken;
}

const SuperTokensSessionPayloadV2Model = z.object({
  version: z.literal('2'),
  superTokensUserId: z.string(),
  email: z.string(),
  userId: z.string(),
  oidcIntegrationId: z.string().nullable(),
});

type SuperTokensSessionPayload = z.TypeOf<typeof SuperTokensSessionPayloadV2Model>;

function sha256(str: string) {
  return c.createHash('sha256').update(str).digest('hex');
}

const AccessTokenInfoModel = z.object({
  iat: z.number(),
  sub: z.string(),
  tId: z.string(),
  rsub: z.string(),
  sessionHandle: z.string(),
  refreshTokenHash1: z.string(),
  parentRefreshTokenHash1: z.string().optional(), // Making this optional as it may not always be present
  antiCsrfToken: z.string().nullable(),
});

type AccessTokenInfo = z.TypeOf<typeof AccessTokenInfoModel>;

const UNSAFE_ACCESS_TOKEN_SIGNING_KEY =
  '-----BEGIN RSA PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCmrnawc+IN/NFQaZQj8ah/tezi6qiaF5NVsk4eoCyZbCEEef0AfJ96xYKwYWJe/BZebRvomaHv09a9swCW041P3QqjkUJRBfdKZpgqYwvXwcbXxbTw8UcGAIeLT8fDczaMbewZrxBf+VakgXQIYy7ekMPPx6VgQTJyP/tX4YUxC6HxeiPpdFCEc6DbuQqzLqr8I0N6B2jr3Gkw3WFq4Ui4zWfMD8pcgsrOlX6irsBT7MKt0KmyGGm92RFzESU075d9KJKEahNnWfkJfy2yBscF/H+cXUIa3To/Ps6XplG/f5L5ocw15pjJiCMg3prA6eaIRAKkbLmY3+2lj3gyPiArAgMBAAECggEAMfQNXBqOv/Rp4riRjigpgITMRsFe4Dd6j29NnD4Sv7Q5PPc2TMQMo6W34hZ9fcv9BDWc7JvGfXK2Y8nWvl0Od8XeH2E0R8YK88BFkEZ40SOg7R+yd5dH2tOjy6uQSdIoofN7k8L0nF7Eia7GUJExBcDK/mVt+afwb28fa5oJ6cV/m4IvN8tkIUH83erdx2p8zvAKiJT/Ljrq3UhstAAGHLT7k52A9CuKiJK7QiFViFNSpNZhz64VDIMkTalL9tyOHvOlI9Dfvjp6uipf2tGwmien24RckrewZHoK/NkLW0esPSDEoF0/ZBrkRvs+RyCJsEvVDVE9O4HsemWTafpeyQKBgQDdJpnAt5QIjNgmoMlKMiL1uptQ5p7bqNX11Jhz0l0A67cBi2+JzA00JRfOPD0JIV8niqCUhIfXC7u1OJcKXGMAG1pjql4HQWd6z6wLPGX05jq7GljHCf5xpKWiY5oYc6XNIcmE9NrJEqmGmJ4pKJ9NeUqCIoKnsxsjXLbyzVQuDQKBgQDA8odNzm6c6gLp0K/qZDy5z/SAUzWQ6IrL1RPG+HnuF4XwuwAzZ3y1fGPYTIZkUadwkQL6DbK2Zqvw73jEamfL9FYS6flw0joq2i4jL9ZYhOxSxXPNdy70PUuqrFnMnWq0JUeNbVz9dXzQC0nTJjUiI4kRBqyo5jW3ckEETHOxFwKBgBIF3E/tZh4QRGlZfy4RyfGWxKOiN94U82L2cXo28adqjl6M24kyXP0b7MW8+QhudM/HJ3ETH/LxnNmXBBAvGU5f7EzlDIaw2NsUY6QCxxhfTvgCnKuT7+2ZCnqifWNywVdnYoH4ZoAuiixS8cjO67Snpt/WKim6mgKWwr4k57BdAoGBAJqSMJ6+X5LJTagujJ9Dyfo5hHBBOMpr4LVGb9+YM2Xv5ldiF9kWcKubiQlA1PENEQx2v2G/E4pYWipcTe1cKOcVSNdCJZiicgLeYtPBgP/NDN2KXSke77iuWi3SgOYQveivbND56eMK+gBY6r2DAFHnEelX5X4xXpslprxg2tXlAoGACv2y3ImZdzaCtQfmD05mEIA8zQLtDMpteO+XFQ8uNZdeG0iBJCi/N523hi5Nbg4Y1jNccwBQQSpq7A17u/j/d6EmCuduosALVQY3ILpd3P8hf8wDOBO6JfAd6DTO3QcrArmFcoJTB2t2zGud9zqdzL1fWNV9/X3Zow2XmHox+CI=\n-----END RSA PRIVATE KEY-----';

function createAccessToken(
  sub: string,
  sessionHandle: string,
  sessionData: string,
  refreshTokenHash1: string,
  parentRefreshTokenHash1: string | null,
) {
  const now = Math.floor(Date.now() / 1000);
  // Access tokens expires in 6 hours
  const expiresIn = Math.floor(now + 60 * 60 * 6 * 1000);

  const data: AccessTokenInfo = {
    iat: now,
    sub,
    tId: 'public',
    rsub: sub,
    sessionHandle,
    antiCsrfToken: null,
    refreshTokenHash1,
    parentRefreshTokenHash1: parentRefreshTokenHash1 ?? undefined,
    ...JSON.parse(sessionData),
  };

  const token = jwt.sign(data, UNSAFE_ACCESS_TOKEN_SIGNING_KEY, {
    algorithm: 'RS256',
    expiresIn,
    keyid: 'd-1770648231409',
    header: {
      kid: 'd-1770648231409',
      typ: 'JWT',
      version: '5',
      alg: 'RS256',
    },
  });

  return { token, expiresIn, d: jwt.decode(token) };
}

function createFrontToken(args: {
  superTokensUserId: string;
  accessToken: ReturnType<typeof createAccessToken>;
}) {
  return Buffer.from(
    JSON.stringify({
      uid: args.superTokensUserId,
      ate: args.accessToken.expiresIn * 1000,
      up: args.accessToken.d,
    }),
  ).toString('base64');
}

const RefreshTokenModel = z.object({
  sessionHandle: z.string(),
  userId: z.string(),
  parentRefreshTokenHash1: z.string().optional(),
  nonce: z.string(),
});
