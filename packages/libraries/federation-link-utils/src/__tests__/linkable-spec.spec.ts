import { parse } from 'graphql';
import { FederatedLink } from '../link';
import { LinkableSpec, NULL_VERSION } from '../linkable-spec';

describe('LinkableSpec', () => {
  const spec = new LinkableSpec('https://specs.graphql-hive.com/example', {
    'v2.0': _resolveImportName => 'Version 2.0 used.',
    'v1.0': _resolveImportName => 'Version 1.0 used.',
    [NULL_VERSION]: _resolveImportName => 'null version used.',
  });

  test('getSupportingVersion returned the most compatible version.', () => {
    const sdl = `
      extend schema
        @link(url: "https://specs.graphql-hive.com/example/v1.1")
    `;

    const links = FederatedLink.fromTypedefs(parse(sdl));
    const specImpl = spec.detectImplementation(links);
    expect(specImpl).toBe('Version 1.0 used.');
  });

  test('getSupportingVersion can return a null version.', () => {
    const sdl = `
      extend schema
        @link(url: "https://specs.graphql-hive.com/example")
    `;

    const links = FederatedLink.fromTypedefs(parse(sdl));
    const specImpl = spec.detectImplementation(links);
    expect(specImpl).toBe('null version used.');
  });
});
