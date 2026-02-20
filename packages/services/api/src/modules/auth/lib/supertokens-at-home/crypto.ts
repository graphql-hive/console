/**
 * A collection of supertokens crypto utilities around.
 * - Refresh Tokens
 * - Access Tokens
 * - Front Tokens
 */

import * as c from 'node:crypto';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import z from 'zod';

export async function hashPassword(plaintextPassword: string): Promise<string> {
  // The "cost factor" or salt rounds. 10 is a good, standard balance of security and performance.
  // This value is included in the final hash string itself.
  const saltRounds = 10;

  // bcrypt.hash handles the generation of a random salt and the hashing process.
  // The operation is asynchronous to prevent blocking the event loop.
  const hash = await bcrypt.hash(plaintextPassword, saltRounds);

  return hash;
}

export async function comparePassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

const pbkdf2Async = promisify(c.pbkdf2);

async function decryptRefreshToken(encodedData: string, masterKey: string) {
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

  const secretKey = await pbkdf2Async(masterKey, iv, iterations, keylen, digest);

  // 4. Separate the encrypted data from the authentication tag.
  const authTagLength = 16; // 128 bits
  const encryptedData = encryptedPayload.slice(0, -authTagLength);
  const authTag = encryptedPayload.slice(-authTagLength);

  // 5. Perform the decryption with the derived key and IV.
  const decipher = c.createDecipheriv('aes-256-gcm', secretKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString('utf-8');
}

function encryptRefreshToken(plaintext: string, masterKey: string) {
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

  // 7. Base64-encode the final buffer
  const base64Data = finalBuffer.toString('base64');
  return base64Data;
}

export function createRefreshToken(
  args: {
    sessionHandle: string;
    userId: string;
    parentRefreshTokenHash1: string | null;
  },
  masterKey: string,
) {
  const newNonce = sha256(crypto.randomUUID());

  const encryptedPayload = encryptRefreshToken(
    JSON.stringify({
      sessionHandle: args.sessionHandle,
      userId: args.userId,
      nonce: newNonce,
      parentRefreshTokenHash1: args.parentRefreshTokenHash1 ?? undefined,
    }),
    masterKey,
  );

  const refreshToken = encryptedPayload + '.' + newNonce + '.' + 'V2';

  return refreshToken;
}

const RefreshTokenPayloadModel = z.object({
  sessionHandle: z.string(),
  userId: z.string(),
  parentRefreshTokenHash1: z.string().optional(),
  nonce: z.string(),
});

type RefreshTokenPayloadType = z.TypeOf<typeof RefreshTokenPayloadModel>;

export async function parseRefreshToken(refreshToken: string, masterKey: string) {
  const [payload, nonce, version] = refreshToken.split('.');

  if (version !== 'V2') {
    return {
      type: 'error',
      code: 'ERR_INVALID_FORMAT',
    } as const;
  }

  let refreshTokenPayload: RefreshTokenPayloadType;
  try {
    refreshTokenPayload = RefreshTokenPayloadModel.parse(
      JSON.parse(await decryptRefreshToken(payload, masterKey)),
    );
  } catch (err) {
    return {
      type: 'error',
      code: 'ERR_INVALID_PAYLOAD',
    } as const;
  }

  if (refreshTokenPayload.nonce !== nonce) {
    return {
      type: 'error',
      code: 'ERR_INVALID_NONCE',
    } as const;
  }

  return {
    type: 'success',
    payload: refreshTokenPayload,
  } as const;
}

export function sha256(str: string) {
  return c.createHash('sha256').update(str).digest('hex');
}

export function createAccessToken(
  args: {
    sub: string;
    sessionHandle: string;
    refreshTokenHash1: string;
    parentRefreshTokenHash1: string | null;
    sessionData: Record<string, unknown>;
  },
  accessTokenKey: AccessTokenKeyContainer,
) {
  const now = Math.floor(Date.now() / 1000);
  // Access tokens expires in 6 hours
  const expiresIn = Math.floor(now + 60 * 60 * 6 * 1000);

  const data: AccessTokenInfo = {
    iat: now,
    exp: expiresIn,
    sub: args.sub,
    tId: 'public',
    rsub: args.sub,
    sessionHandle: args.sessionHandle,
    antiCsrfToken: null,
    refreshTokenHash1: args.refreshTokenHash1,
    parentRefreshTokenHash1: args.parentRefreshTokenHash1 ?? undefined,
    ...args.sessionData,
  };

  const token = jwt.sign(data, accessTokenKey.privateKey, {
    header: {
      kid: accessTokenKey.keyId,
      typ: 'JWT',
      alg: 'RS256',
    },
  });

  return { token, expiresIn, d: jwt.decode(token) };
}

export function isAccessToken(accessToken: string) {
  return !!jwt.decode(accessToken);
}

export function parseAccessToken(accessToken: string, accessTokenPublicKey: string) {
  const token = jwt.verify(accessToken, accessTokenPublicKey, {
    algorithms: ['RS256'],
  });

  return AccessTokenInfoModel.parse(token);
}

export function createFrontToken(args: {
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

const AccessTokenInfoModel = z.object({
  iat: z.number(),
  exp: z.number(),
  sub: z.string(),
  tId: z.string(),
  rsub: z.string(),
  sessionHandle: z.string(),
  refreshTokenHash1: z.string(),
  parentRefreshTokenHash1: z.string().optional(), // Making this optional as it may not always be present
  antiCsrfToken: z.string().nullable(),
});

type AccessTokenInfo = z.TypeOf<typeof AccessTokenInfoModel>;

export function getPasswordResetHash() {
  return c.randomBytes(32).toString('hex');
}

export class AccessTokenKeyContainer {
  readonly keyId: string;
  readonly publicKey: string;
  readonly privateKey: string;

  constructor(accessTokenKey: string) {
    const [keyName, publicKey, privateKey] = accessTokenKey.split('|');
    this.keyId = keyName;
    this.publicKey = `-----BEGIN PUBLIC KEY-----\n` + publicKey + `\n-----END PUBLIC KEY-----`;
    this.privateKey = `-----BEGIN PRIVATE KEY-----\n` + privateKey + `\n-----END PRIVATE KEY-----`;
  }
}
