import { Scope, testkit } from 'graphql-modules';
import 'reflect-metadata';
import { Encryptor } from '@hive/service-common';

// `Encryptor` is a plain class from a framework-free package that doubles as its own
// injection token, provided with `useValue` in create.ts (same as PostgresDatabasePool).
// Nothing else type-checks that arrangement, and a consumer switching to
// `import type { Encryptor }` would erase the decorator metadata and break resolution at
// runtime with no compile error.
test('resolves as a graphql-modules injection token', () => {
  const encryptor = testkit
    .testInjector([
      {
        provide: Encryptor,
        scope: Scope.Singleton,
        useValue: new Encryptor('secret'),
      },
    ])
    .get(Encryptor);

  expect(encryptor).toBeInstanceOf(Encryptor);
  expect(encryptor.decrypt(encryptor.encrypt('foo'))).toBe('foo');
});
