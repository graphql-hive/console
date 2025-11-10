import * as Crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * @module OrganizationAccessKey
 * Contains functions for generating an organization acces key.
 */

/**
 * Payload within the access token.
 */
type DecodedAccessKey = {
  /** UUID as stored within the database ("organization_access_tokens"."id") */
  id: string;
  /** string to compare against the hash within the database ("organization_access_tokens"."hash") */
  privateKey: string;
  /** The category of the access token */
  category: AccessTokenCategory;
};

export const enum AccessTokenCategory {
  organization = 'o',
  project = 'p',
  personal = 'u',
}

type KeyPrefix = `hv${AccessTokenCategory}1/`;

/**
 * Prefix for the organization access key.
 * We use this prefix so we can quickly identify whether an organization access token.
 *
 * **hv** -> Hive
 * **o** or **p** or **u** -> Organization or Project or User
 * **1**  -> Version 1
 */
const keyPrefix = (category: AccessTokenCategory): KeyPrefix =>
  `hv${category}1/` satisfies KeyPrefix;
const decodeError = { type: 'error' as const, reason: 'Invalid access token.' };

function encode(recordId: string, secret: string, category: AccessTokenCategory) {
  const keyContents = [recordId, secret].join(':');
  return keyPrefix(category) + btoa(keyContents);
}

/**
 * Attempt to decode a user provided access token string into the embedded id and private key.
 */
export function decode(
  accessToken: string,
): { type: 'error'; reason: string } | { type: 'ok'; accessKey: DecodedAccessKey } {
  let category: null | AccessTokenCategory = null;

  if (accessToken.startsWith(keyPrefix(AccessTokenCategory.organization))) {
    category = AccessTokenCategory.organization;
  } else if (accessToken.startsWith(keyPrefix(AccessTokenCategory.project))) {
    category = AccessTokenCategory.project;
  } else if (accessToken.startsWith(keyPrefix(AccessTokenCategory.personal))) {
    category = AccessTokenCategory.personal;
  }

  if (category === null) {
    return decodeError;
  }

  accessToken = accessToken.slice(keyPrefix(category).length);

  let str: string;

  try {
    str = globalThis.atob(accessToken);
  } catch (error) {
    return decodeError;
  }

  const parts = str.split(':');

  if (parts.length > 2) {
    return decodeError;
  }

  const id = parts.at(0);
  const privateKey = parts.at(1);

  if (id && privateKey) {
    return { type: 'ok', accessKey: { id, privateKey, category } } as const;
  }

  return decodeError;
}

/**
 * Creates a new organization access key/token for a provided UUID.
 */
export async function create(id: string, category: AccessTokenCategory) {
  const secret = Crypto.createHash('sha256')
    .update(Crypto.randomBytes(20).toString())
    .digest('hex');

  const hash = await bcrypt.hash(secret, await bcrypt.genSalt());
  const privateAccessToken = encode(id, secret, category);
  const firstCharacters = privateAccessToken.substr(0, 10);

  return {
    privateAccessToken,
    hash,
    firstCharacters,
  };
}

/**
 * Verify whether a organization access key private key matches the
 * hash stored within the "organization_access_tokens"."hash" table.
 */
export async function verify(secret: string, hash: string) {
  return await bcrypt.compare(secret, hash);
}
