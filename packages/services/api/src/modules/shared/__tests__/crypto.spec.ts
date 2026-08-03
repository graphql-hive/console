import { testkit } from 'graphql-modules';
import 'reflect-metadata';
import { createEncryptor } from '@hive/service-common';
import { CryptoProvider, encryptionSecretProvider } from '../providers/crypto';

test('should decrypt encrypted value', () => {
  const cryptoProvider = testkit
    .testInjector([CryptoProvider, encryptionSecretProvider('secret')])
    .get(CryptoProvider);
  const encrypted = cryptoProvider.encrypt('foo');

  expect(cryptoProvider.decrypt(encrypted)).toBe('foo');
});

test('should read raw value when decrypting (when possiblyRaw is enabled)', () => {
  const cryptoProvider = testkit
    .testInjector([CryptoProvider, encryptionSecretProvider('secret')])
    .get(CryptoProvider);

  expect(cryptoProvider.decrypt('foo', true)).toBe('foo');
});

test('should NOT read raw value when decrypting', () => {
  const cryptoProvider = testkit
    .testInjector([CryptoProvider, encryptionSecretProvider('secret')])
    .get(CryptoProvider);

  expect(() => {
    cryptoProvider.decrypt('foo');
  }).toThrow();
});

test('should NOT decrypt value encrypted with different secret', () => {
  const aCryptoProvider = testkit
    .testInjector([CryptoProvider, encryptionSecretProvider('secret')])
    .get(CryptoProvider);
  const bCryptoProvider = testkit
    .testInjector([CryptoProvider, encryptionSecretProvider('other-secret')])
    .get(CryptoProvider);

  const encrypted = aCryptoProvider.encrypt('a');
  expect(() => {
    bCryptoProvider.decrypt(encrypted);
  }).toThrow();
});

// Services without graphql-modules (workflows, schema) use `createEncryptor` directly on
// the same columns this provider writes, so the two must stay interchangeable.
test('should decrypt a value encrypted by the shared encryptor', () => {
  const cryptoProvider = testkit
    .testInjector([CryptoProvider, encryptionSecretProvider('secret')])
    .get(CryptoProvider);

  const encrypted = createEncryptor('secret').encrypt('foo');

  expect(cryptoProvider.decrypt(encrypted)).toBe('foo');
});

test('should produce a value the shared encryptor can decrypt', () => {
  const cryptoProvider = testkit
    .testInjector([CryptoProvider, encryptionSecretProvider('secret')])
    .get(CryptoProvider);

  const encrypted = cryptoProvider.encrypt('foo');

  expect(createEncryptor('secret').decrypt(encrypted)).toBe('foo');
});
