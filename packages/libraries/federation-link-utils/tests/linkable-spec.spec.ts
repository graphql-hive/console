import { parse } from 'graphql';
import { FederatedLink } from '../src/link';
import { LinkableSpec, NULL_VERSION } from '../src/linkable-spec';

describe('LinkableSpec', () => {
  const spec = new LinkableSpec('https://specs.graphql-hive.com/example', {
    'v2.3': _resolveImportName => 'Version 2.3 used.',
    'v1.0': _resolveImportName => 'Version 1.0 used.',
    [NULL_VERSION]: _resolveImportName => 'null version used.',
  });

  describe('#detectImplementation', () => {
    test('returns an exact version.', () => {
      const sdl = `
        extend schema
          @link(url: "https://specs.graphql-hive.com/example/v1.0")
      `;

      const links = FederatedLink.fromTypedefs(parse(sdl));
      const specImpl = spec.detectImplementation(links);
      expect(specImpl).toBe('Version 1.0 used.');
    });

    test('returns a compatible version.', () => {
      const sdl = `
        extend schema
          @link(url: "https://specs.graphql-hive.com/example/v2.1")
      `;

      const links = FederatedLink.fromTypedefs(parse(sdl));
      const specImpl = spec.detectImplementation(links);
      expect(specImpl).toBe('Version 2.3 used.');
    });

    test('throws when the identity is supported but the version is outside what the implementation supports.', () => {
      const sdl = `
        extend schema
          @link(url: "https://specs.graphql-hive.com/example/v2.9")
      `;

      const links = FederatedLink.fromTypedefs(parse(sdl));
      expect(() => spec.detectImplementation(links)).toThrow();
    });

    test('can return a null version.', () => {
      const sdl = `
        extend schema
          @link(url: "https://specs.graphql-hive.com/example")
      `;

      const links = FederatedLink.fromTypedefs(parse(sdl));
      const specImpl = spec.detectImplementation(links);
      expect(specImpl).toBe('null version used.');
    });

    test('returns undefined when identities do not match.', () => {
      const sdl = `
        extend schema
          @link(url: "https://specs.graphql-hive.com/not-example")
      `;

      const links = FederatedLink.fromTypedefs(parse(sdl));
      const specImpl = spec.detectImplementation(links);
      expect(specImpl).toBe(undefined);
    });
  });
});
