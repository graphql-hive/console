import * as Crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * @module OrganizationAccessKey
 * Contains functions for generating an organization acces key.
 */

/**
 * Prefix for the access key
 * **hv** -> Hive
 * **o**  -> Organization
 * **1**  -> Version 1
 */
const keyPrefix = 'hvo1/';
const decodeError = { type: 'failure', reason: 'Invalid access token.' } as const;

function encode(recordId: string, secret: string) {
  const keyContents = [recordId, secret].join(':');
  return keyPrefix + btoa(keyContents);
}

export function decode(accessToken: string) {
  if (!accessToken.startsWith(keyPrefix)) {
    return decodeError;
  }

  accessToken = accessToken.slice(keyPrefix.length);

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

  const accessTokenRecordId = parts.at(0);
  const privateKey = parts.at(1);

  if (accessTokenRecordId && privateKey) {
    return { type: 'success', token: { accessTokenRecordId, privateKey } } as const;
  }

  return decodeError;
}

export async function create(recordId: string) {
  const secret = Crypto.createHash('sha256')
    .update(Crypto.randomBytes(20).toString())
    .digest('hex');

  const hash = await bcrypt.hash(secret, await bcrypt.genSalt());
  const privateAccessToken = encode(recordId, secret);
  const firstCharacters = privateAccessToken.substr(0, 10);

  return {
    privateAccessToken,
    hash,
    firstCharacters,
  };
}
