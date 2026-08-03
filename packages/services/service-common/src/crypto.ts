import crypto from 'node:crypto';

const ALG = 'aes256';
const IN_ENC = 'utf8';
const OUT_ENC = 'hex';
const IV = 16;

/**
 * Shared by every service that touches an encrypted column (`organizations.slack_token`,
 * OIDC client secrets, external composition secrets). The wire format is load-bearing:
 * values encrypted by one service are decrypted by another, so changing the algorithm or
 * the output shape silently bricks every stored secret. `crypto.spec.ts` pins it with a
 * frozen ciphertext vector.
 *
 * Doubles as its own injection token in the API's graphql-modules container, provided
 * with `useValue` the same way `PostgresDatabasePool` is. That means consumers must
 * import it as a value: `import type { Encryptor }` erases at runtime, leaving the
 * decorator metadata as `Object` and breaking injection with no compile-time error.
 */
export class Encryptor {
  private secret: string;

  constructor(encryptionSecret: string) {
    this.secret = crypto.createHash('md5').update(encryptionSecret).digest('hex');
  }

  encrypt(text: string) {
    const secretBuffer = Buffer.from(this.secret, 'latin1');
    const iv = crypto.randomBytes(IV);
    const cipher = crypto.createCipheriv(ALG, secretBuffer, iv);
    const ciphered = cipher.update(text, IN_ENC, OUT_ENC) + cipher.final(OUT_ENC);
    return iv.toString(OUT_ENC) + ':' + ciphered;
  }

  decrypt(text: string, possiblyRaw?: boolean) {
    if (possiblyRaw) {
      // The result of `encrypt()` is `<iv(32 chars)>:<encrypted(n chars)>`
      // We're looking for this pattern here.
      // If it has more than 32 characters and `:` after 32 chars, it's encrypted.
      const isEncrypted = text.length > 32 && text.indexOf(':') === 32;

      if (!isEncrypted) {
        return text;
      }
    }

    const secretBuffer = Buffer.from(this.secret, 'latin1');
    const components = text.split(':');
    const iv = Buffer.from(components.shift() || '', OUT_ENC);
    const decipher = crypto.createDecipheriv(ALG, secretBuffer, iv);

    return decipher.update(components.join(':'), OUT_ENC, IN_ENC) + decipher.final(IN_ENC);
  }
}
