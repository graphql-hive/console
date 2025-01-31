import { parse } from 'graphql';
import { FederatedLink } from '../link';

function trimMultiline(str: string): string {
  return str
    .split('\n')
    .map(s => s.trim())
    .filter(l => !!l)
    .join('\n');
}

describe('FederatedLink', () => {
  test.each([
    `
      extend schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/federation/v2.0")
    `,
    `
      extend schema
        @link(url: "https://specs.apollo.dev/link/v1.0", as: "@linkz")
        @link(url: "https://specs.apollo.dev/federation/v2.0", as: "fed", import: ["@key"])
    `,
    `
      extend schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/federation/v2.0", import: [{ name: "@key", as: "@lookup" }])
    `,
  ])('fromTypedefs', (sdl: string) => {
    // string manipulate to extract just the link trings
    const firstLinkPos = sdl.indexOf('@link(');
    const linksOnly = trimMultiline(sdl.substring(firstLinkPos));
    // compare to parsed result
    const typeDefs = parse(sdl);
    const links = FederatedLink.fromTypedefs(typeDefs);
    expect(links.join('\n')).toBe(linksOnly);
  });

  test('resolveImportName', () => {
    const sdl = `
      extend schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/federation/v2.0", import: [{ name: "@key", as: "@lookup" }, "@provides"])
        @link(url: "https://unnamed.graphql-hive.com/v0.1", import: ["@meta"])
        @link(url: "https://specs.graphql-hive.com/hive/v0.1", import: ["@group"], as: "hivelink")
    `;
    const links = FederatedLink.fromTypedefs(parse(sdl));
    const federationLink = links.find(l => l.identity === 'https://specs.apollo.dev/federation');
    expect(federationLink).toBeDefined();
    // aliased
    expect(federationLink?.resolveImportName('@key')).toBe('lookup');
    // unimported
    expect(federationLink?.resolveImportName('@external')).toBe('federation__external');
    // imported by name only
    expect(federationLink?.resolveImportName('@provides')).toBe('provides');

    // default import
    const linkLink = links.find(l => l.identity === 'https://specs.apollo.dev/link');
    expect(linkLink?.resolveImportName('@link')).toBe('link');

    // unnamespaced
    const unnamedLink = links.find(l => l.identity === 'https://unnamed.graphql-hive.com');
    expect(unnamedLink).toBeDefined();
    expect(unnamedLink?.resolveImportName('@meta')).toBe('meta');
    expect(unnamedLink?.resolveImportName('@unmentioned')).toBe('unmentioned');

    // imported as
    const hiveLink = links.find(l => l.identity === 'https://specs.graphql-hive.com/hive');
    expect(hiveLink?.resolveImportName('@group')).toBe('group');
    expect(hiveLink?.resolveImportName('@eg')).toBe('hivelink__eg');
  });
});
