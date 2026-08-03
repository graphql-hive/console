import { Inject, Injectable, InjectionToken, Scope } from 'graphql-modules';
import { createEncryptor, type Encryptor } from '@hive/service-common';

export const ENCRYPTION_SECRET = new InjectionToken<string>('ENCRYPTION_SECRET');

export function encryptionSecretProvider(value: string) {
  return {
    provide: ENCRYPTION_SECRET,
    useValue: value,
    scope: Scope.Singleton,
  };
}

/**
 * DI wrapper around the shared encryptor. The implementation lives in
 * `@hive/service-common` so services without graphql-modules (workflows, schema) can
 * decrypt the same values.
 */
@Injectable({
  scope: Scope.Singleton,
})
export class CryptoProvider {
  private encryptor: Encryptor;

  constructor(@Inject(ENCRYPTION_SECRET) encryptionSecret: string) {
    this.encryptor = createEncryptor(encryptionSecret);
  }

  encrypt(text: string) {
    return this.encryptor.encrypt(text);
  }

  decrypt(text: string, possiblyRaw?: boolean) {
    return this.encryptor.decrypt(text, possiblyRaw);
  }
}
