import { Encryptor } from './crypto';

// Encrypted with the secret 'secret'. Frozen on purpose: this is the only thing that
// catches a change to the algorithm or the output shape, which would make every
// already-stored secret in production undecryptable.
const GOLDEN_CIPHERTEXT =
  '31c4ea06cc8b62a75b8b85b8124e3ca3:e2694f7332c9eb69963f80f9164aed3e9814e1d81fd96937674f9db65e6baff8';
const GOLDEN_PLAINTEXT = 'xoxb-legacy-token';

describe('Encryptor', () => {
  test('decrypts what it encrypted', () => {
    const encryptor = new Encryptor('secret');

    expect(encryptor.decrypt(encryptor.encrypt('foo'))).toBe('foo');
  });

  test('decrypts a ciphertext frozen before this module was extracted', () => {
    expect(new Encryptor('secret').decrypt(GOLDEN_CIPHERTEXT)).toBe(GOLDEN_PLAINTEXT);
  });

  test('emits the `<iv>:<ciphertext>` shape the possiblyRaw sniff depends on', () => {
    const encrypted = new Encryptor('secret').encrypt('foo');

    expect(encrypted.indexOf(':')).toBe(32);
    expect(encrypted.length).toBeGreaterThan(32);
  });

  // Rows written before encryption was introduced are still plaintext, so every
  // read path has to tolerate them.
  test('returns a raw value untouched when possiblyRaw is set', () => {
    expect(new Encryptor('secret').decrypt('foo', true)).toBe('foo');
  });

  test('throws on a raw value when possiblyRaw is not set', () => {
    expect(() => new Encryptor('secret').decrypt('foo')).toThrow();
  });

  test('throws when decrypting with a different secret', () => {
    const encrypted = new Encryptor('secret').encrypt('a');

    expect(() => new Encryptor('other-secret').decrypt(encrypted)).toThrow();
  });
});
